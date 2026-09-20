"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRATION_ACTION_URL = exports.DEMANDE_EMAIL_STATUSES = exports.RENDEZ_VOUS_ACTION_URL = exports.demandeActionUrl = void 0;
exports.sendEmailToUser = sendEmailToUser;
exports.createNotification = createNotification;
exports.listNotifications = listNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.demandeStatusMessage = demandeStatusMessage;
exports.rendezVousMessage = rendezVousMessage;
exports.notifyRendezVous = notifyRendezVous;
exports.rendezVousEventForStatus = rendezVousEventForStatus;
exports.notifyRegistrationDecision = notifyRegistrationDecision;
exports.notifyDemandeStatusChange = notifyDemandeStatusChange;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const mailer_1 = require("@poramma/mailer");
const notifications_1 = require("../schema/notifications");
const identity_1 = require("../schema/identity");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const appUrl = () => (process.env.PUBLIC_APP_URL || "http://localhost:5174").replace(/\/$/, "");
async function sendEmailToUser(db, userId, mail) {
    try {
        const [user] = await db.select({ email: identity_1.identityUsers.email }).from(identity_1.identityUsers).where((0, drizzle_orm_1.eq)(identity_1.identityUsers.id, userId));
        if (!user?.email)
            return;
        await (0, mailer_1.sendMail)({
            to: user.email,
            subject: mail.subject,
            html: (0, mailer_1.renderEmail)({
                title: mail.title,
                paragraphs: mail.paragraphs,
                action: mail.actionLabel && mail.actionPath ? { label: mail.actionLabel, url: `${appUrl()}${mail.actionPath}` } : undefined,
            }),
        });
    }
    catch (err) {
        console.error("[notifications] envoi d'email échoué :", err.message);
    }
}
async function createNotification(db, params) {
    try {
        await db.insert(notifications_1.notifications).values({
            id: newId("notif"),
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            payload: params.payload ?? null,
            channel: "IN_APP",
            status: "SENT",
            actionUrl: params.actionUrl ?? null,
            sentAt: new Date(),
        });
    }
    catch (err) {
        console.error("[notifications] échec d'écriture", err);
    }
    if (params.email) {
        void sendEmailToUser(db, params.userId, {
            subject: params.email.subject ?? params.title,
            title: params.title,
            paragraphs: [params.body],
            actionLabel: params.email.actionLabel,
            actionPath: params.actionUrl,
        });
    }
}
async function listNotifications(db, userId, opts = {}) {
    const conditions = [(0, drizzle_orm_1.eq)(notifications_1.notifications.userId, userId)];
    if (opts.unreadOnly)
        conditions.push((0, drizzle_orm_1.eq)(notifications_1.notifications.status, "SENT"));
    return db
        .select()
        .from(notifications_1.notifications)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(notifications_1.notifications.createdAt))
        .limit(opts.limit ?? 100);
}
async function getUnreadCount(db, userId) {
    const [row] = await db
        .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(notifications_1.notifications)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notifications_1.notifications.userId, userId), (0, drizzle_orm_1.eq)(notifications_1.notifications.status, "SENT")));
    return row?.n ?? 0;
}
async function markAsRead(db, userId, notificationId) {
    const [existing] = await db.select().from(notifications_1.notifications).where((0, drizzle_orm_1.eq)(notifications_1.notifications.id, notificationId));
    if (!existing)
        throw new utils_1.NotFoundError("Notification introuvable");
    if (existing.userId !== userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à cette notification");
    await db.update(notifications_1.notifications).set({ status: "READ", readAt: new Date() }).where((0, drizzle_orm_1.eq)(notifications_1.notifications.id, notificationId));
}
async function markAllAsRead(db, userId) {
    await db
        .update(notifications_1.notifications)
        .set({ status: "READ", readAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notifications_1.notifications.userId, userId), (0, drizzle_orm_1.eq)(notifications_1.notifications.status, "SENT")));
}
const demandeActionUrl = (demandeId) => `/services/mesdemandes/details/${demandeId}`;
exports.demandeActionUrl = demandeActionUrl;
function demandeStatusMessage(status, ctx) {
    const ref = ctx.serviceName ? `${ctx.dossierNumber} (${ctx.serviceName})` : ctx.dossierNumber;
    const note = ctx.agentComment?.trim();
    const endSentence = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);
    const withNote = (text, label) => (note ? `${text} ${label} : ${endSentence(note)}` : text);
    switch (status) {
        case "SUBMITTED":
            return { title: "Demande reçue", body: `Votre demande ${ref} a bien été reçue par l'ambassade.`, tone: "info" };
        case "IN_REVIEW":
            return { title: "Demande en cours d'examen", body: withNote(`Votre demande ${ref} est prise en charge par l'ambassade.`, "Message de l'ambassade"), tone: "info" };
        case "UNDER_VERIFICATION":
            return { title: "Vérification en cours", body: withNote(`Les pièces de votre demande ${ref} sont en cours de vérification.`, "Message de l'ambassade"), tone: "info" };
        case "ADDITIONAL_INFO_REQUIRED":
            return {
                title: "Complément d'information requis",
                body: withNote(`L'ambassade a besoin d'éléments supplémentaires pour votre demande ${ref}. Ouvrez votre dossier pour répondre.`, "Précision de l'ambassade"),
                tone: "warning",
            };
        case "APPROVED":
            return { title: "Demande approuvée", body: withNote(`Votre demande ${ref} a été approuvée. Son traitement se poursuit.`, "Message de l'ambassade"), tone: "success" };
        case "COMPLETED":
            return {
                title: "Traitement terminé",
                body: withNote(`Le traitement de votre demande ${ref} est terminé. Si votre présence est nécessaire pour finaliser ce service, rendez-vous à l'ambassade (les frais éventuels se règlent en espèces sur place).`, "Message de l'ambassade"),
                tone: "success",
            };
        case "REJECTED":
            return {
                title: "Demande rejetée",
                body: withNote(`Votre demande ${ref} a été rejetée.`, "Motif") + " Vous pouvez déposer une nouvelle demande ou contacter l'ambassade pour plus d'informations.",
                tone: "error",
            };
        case "CANCELLED":
            return { title: "Demande annulée", body: withNote(`Votre demande ${ref} a été annulée.`, "Message de l'ambassade"), tone: "warning" };
        default:
            return null;
    }
}
exports.RENDEZ_VOUS_ACTION_URL = "/services/rendez-vous";
const frDate = (iso) => iso.split("-").reverse().join("/");
function rendezVousMessage(event, ctx) {
    const what = `${ctx.serviceName ? `${ctx.serviceName} — ` : ""}${frDate(ctx.date)} à ${ctx.startTime}`;
    switch (event) {
        case "BOOKED":
            return { title: "Rendez-vous enregistré", body: `Votre rendez-vous ${ctx.ticketId} (${what}) est enregistré. Il est en attente de confirmation par l'ambassade.` };
        case "RESCHEDULED":
            return { title: "Rendez-vous déplacé", body: `Votre rendez-vous a été déplacé : ${ctx.ticketId} (${what}). Il est de nouveau en attente de confirmation.` };
        case "CONFIRMED":
            return { title: "Rendez-vous confirmé", body: `Votre rendez-vous ${ctx.ticketId} (${what}) est confirmé. Présentez-vous à l'ambassade avec votre pièce d'identité.` };
        case "CANCELLED_BY_USER":
            return { title: "Rendez-vous annulé", body: `Vous avez annulé votre rendez-vous ${ctx.ticketId} (${what}). Vous pouvez en reprendre un à tout moment.` };
        case "CANCELLED_BY_AGENT":
            return { title: "Rendez-vous annulé par l'ambassade", body: `Votre rendez-vous ${ctx.ticketId} (${what}) a été annulé par l'ambassade. Merci d'en reprendre un nouveau.` };
        case "NO_SHOW":
            return { title: "Rendez-vous manqué", body: `Vous ne vous êtes pas présenté(e) à votre rendez-vous ${ctx.ticketId} (${what}). Vous pouvez en reprendre un nouveau.` };
    }
}
async function notifyRendezVous(db, params) {
    const msg = rendezVousMessage(params.event, params);
    await createNotification(db, {
        userId: params.userId,
        type: "RDV",
        title: msg.title,
        body: msg.body,
        payload: { rendezVousId: params.rendezVousId, event: params.event },
        actionUrl: exports.RENDEZ_VOUS_ACTION_URL,
        email: { subject: `${msg.title} — ${params.ticketId}`, actionLabel: "Voir mes rendez-vous" },
    });
}
function rendezVousEventForStatus(status) {
    switch (status) {
        case "CONFIRMED":
            return "CONFIRMED";
        case "CANCELLED_BY_AGENT":
            return "CANCELLED_BY_AGENT";
        case "NO_SHOW":
        case "MISSED":
            return "NO_SHOW";
        default:
            return null;
    }
}
exports.DEMANDE_EMAIL_STATUSES = new Set(["ADDITIONAL_INFO_REQUIRED", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"]);
exports.REGISTRATION_ACTION_URL = "/enregistrement";
async function notifyRegistrationDecision(db, params) {
    const note = params.note?.trim();
    const endSentence = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);
    const content = {
        VALIDATED: {
            title: "Dossier validé — vous êtes enregistré(e)",
            body: `Votre dossier d'enregistrement a été validé par l'ambassade.${params.inue ? ` Votre numéro INUE est le ${params.inue}.` : ""} Vous pouvez désormais faire vos demandes, prendre rendez-vous et échanger avec l'ambassade.`,
            action: "Accéder à mon espace",
        },
        REJECTED: {
            title: "Votre dossier doit être corrigé",
            body: `L'ambassade a demandé des corrections sur votre dossier d'enregistrement.${note ? ` Motif : ${endSentence(note)}` : ""} Corrigez les informations ou pièces concernées puis soumettez-le à nouveau.`,
            action: "Corriger mon dossier",
        },
        INUE_ASSIGNED: {
            title: "Votre numéro INUE est disponible",
            body: `Votre numéro INUE est le ${params.inue ?? "—"}. Conservez-le : il peut vous être demandé pour vos démarches auprès de l'ambassade.`,
            action: "Voir mon dossier",
        },
        SUSPENDED: {
            title: "Dossier suspendu",
            body: `Votre dossier d'enregistrement a été suspendu.${note ? ` Motif : ${endSentence(note)}` : ""} Contactez l'ambassade pour régulariser votre situation.`,
            action: "Voir mon dossier",
        },
    }[params.decision];
    await createNotification(db, {
        userId: params.userId,
        type: "DOSSIER",
        title: content.title,
        body: content.body,
        payload: { decision: params.decision },
        actionUrl: exports.REGISTRATION_ACTION_URL,
        email: { actionLabel: content.action },
    });
}
async function notifyDemandeStatusChange(db, params) {
    const msg = demandeStatusMessage(params.status, params);
    if (!msg)
        return null;
    await createNotification(db, {
        userId: params.userId,
        type: "DEMANDE",
        title: msg.title,
        body: msg.body,
        payload: { demandeId: params.demandeId, status: params.status },
        actionUrl: (0, exports.demandeActionUrl)(params.demandeId),
        email: exports.DEMANDE_EMAIL_STATUSES.has(params.status)
            ? { subject: `${msg.title} — dossier ${params.dossierNumber}`, actionLabel: "Voir ma demande" }
            : undefined,
    });
    return { title: msg.title, body: msg.body };
}
//# sourceMappingURL=notifications.js.map