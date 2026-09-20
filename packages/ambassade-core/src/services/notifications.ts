import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@poramma/utils";
import { sendMail, renderEmail } from "@poramma/mailer";
import type { Db } from "../db-type";
import { notifications } from "../schema/notifications";
import { identityUsers } from "../schema/identity";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** URL publique du portail citoyen (boutons des emails). */
const appUrl = () => (process.env.PUBLIC_APP_URL || "http://localhost:5174").replace(/\/$/, "");

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  actionUrl?: string | null;
  /** Envoie aussi la notification par email au titulaire (en plus de l'in-app). */
  email?: {
    /** Sujet de l'email (défaut : le titre). */
    subject?: string;
    /** Libellé du bouton qui ouvre `actionUrl` dans le portail. */
    actionLabel?: string;
  };
}

/** Envoie un email au titulaire du compte. Ne lève jamais (best-effort, journalisé). */
export async function sendEmailToUser(
  db: Db,
  userId: string,
  mail: { subject: string; title: string; paragraphs: string[]; actionLabel?: string; actionPath?: string | null }
): Promise<void> {
  try {
    const [user] = await db.select({ email: identityUsers.email }).from(identityUsers).where(eq(identityUsers.id, userId));
    if (!user?.email) return;
    await sendMail({
      to: user.email,
      subject: mail.subject,
      html: renderEmail({
        title: mail.title,
        paragraphs: mail.paragraphs,
        action: mail.actionLabel && mail.actionPath ? { label: mail.actionLabel, url: `${appUrl()}${mail.actionPath}` } : undefined,
      }),
    });
  } catch (err) {
    console.error("[notifications] envoi d'email échoué :", (err as Error).message);
  }
}

/**
 * Écrit une notification in-app (statut SENT = non lue) et, si demandé,
 * l'envoie aussi par email. Ne lève jamais : une notification ratée ne doit
 * pas faire échouer la mutation métier. L'email part en arrière-plan (un
 * relais SMTP lent ne ralentit pas la requête du citoyen).
 */
export async function createNotification(db: Db, params: CreateNotificationParams): Promise<void> {
  try {
    await db.insert(notifications).values({
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
  } catch (err) {
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

export async function listNotifications(db: Db, userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
  const conditions = [eq(notifications.userId, userId)];
  if (opts.unreadOnly) conditions.push(eq(notifications.status, "SENT"));
  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(opts.limit ?? 100);
}

export async function getUnreadCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.status, "SENT")));
  return row?.n ?? 0;
}

export async function markAsRead(db: Db, userId: string, notificationId: string): Promise<void> {
  const [existing] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!existing) throw new NotFoundError("Notification introuvable");
  if (existing.userId !== userId) throw new ForbiddenError("Accès non autorisé à cette notification");
  await db.update(notifications).set({ status: "READ", readAt: new Date() }).where(eq(notifications.id, notificationId));
}

export async function markAllAsRead(db: Db, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ status: "READ", readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, "SENT")));
}

/** Chemin frontend-community du détail d'une demande — utilisé comme `actionUrl` des notifications. */
export const demandeActionUrl = (demandeId: string) => `/services/mesdemandes/details/${demandeId}`;

/**
 * Message affiché au citoyen pour un changement de statut de sa demande.
 * `null` = aucun message (statut interne au personnel, ex. archivage).
 * `agentComment` = commentaire de l'agent, à ne passer que s'il est visible du demandeur.
 */
export function demandeStatusMessage(
  status: string,
  ctx: { dossierNumber: string; serviceName?: string | null; agentComment?: string | null }
): { title: string; body: string; tone: "info" | "success" | "warning" | "error" } | null {
  const ref = ctx.serviceName ? `${ctx.dossierNumber} (${ctx.serviceName})` : ctx.dossierNumber;
  const note = ctx.agentComment?.trim();
  const endSentence = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
  const withNote = (text: string, label: string) => (note ? `${text} ${label} : ${endSentence(note)}` : text);

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
        body: withNote(
          `Le traitement de votre demande ${ref} est terminé. Si votre présence est nécessaire pour finaliser ce service, rendez-vous à l'ambassade (les frais éventuels se règlent en espèces sur place).`,
          "Message de l'ambassade"
        ),
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

/** Chemin frontend-community de la page « Mes rendez-vous ». */
export const RENDEZ_VOUS_ACTION_URL = "/services/rendez-vous";

export type RendezVousEvent = "BOOKED" | "RESCHEDULED" | "CONFIRMED" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW";

/** "2026-09-18" → "18/09/2026". */
const frDate = (iso: string) => iso.split("-").reverse().join("/");

export function rendezVousMessage(
  event: RendezVousEvent,
  ctx: { ticketId: string; serviceName?: string | null; date: string; startTime: string }
): { title: string; body: string } {
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

/** Notification in-app liée à un rendez-vous (ne lève jamais). */
export async function notifyRendezVous(
  db: Db,
  params: { userId: string; rendezVousId: string; event: RendezVousEvent; ticketId: string; serviceName?: string | null; date: string; startTime: string }
): Promise<void> {
  const msg = rendezVousMessage(params.event, params);
  await createNotification(db, {
    userId: params.userId,
    type: "RDV",
    title: msg.title,
    body: msg.body,
    payload: { rendezVousId: params.rendezVousId, event: params.event },
    actionUrl: RENDEZ_VOUS_ACTION_URL,
    email: { subject: `${msg.title} — ${params.ticketId}`, actionLabel: "Voir mes rendez-vous" },
  });
}

/** Statut de rendez-vous posé par le personnel → événement notifié au citoyen (`null` = pas de notification). */
export function rendezVousEventForStatus(status: string): RendezVousEvent | null {
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

/** Statuts de demande pour lesquels le demandeur reçoit aussi un email (en plus de la notification in-app). */
export const DEMANDE_EMAIL_STATUSES = new Set(["ADDITIONAL_INFO_REQUIRED", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"]);

/** Chemin frontend-community de la page « Mon dossier » d'enregistrement. */
export const REGISTRATION_ACTION_URL = "/enregistrement";

/**
 * Décision de l'ambassade sur le dossier d'enregistrement du citoyen
 * (validation avec INUE, rejet à corriger, suspension) — in-app + email.
 */
export async function notifyRegistrationDecision(
  db: Db,
  params: { userId: string; decision: "VALIDATED" | "REJECTED" | "SUSPENDED" | "INUE_ASSIGNED"; inue?: string | null; note?: string | null }
): Promise<void> {
  const note = params.note?.trim();
  const endSentence = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
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
    actionUrl: REGISTRATION_ACTION_URL,
    email: { actionLabel: content.action },
  });
}

/** Notifie le demandeur d'un changement de statut de sa demande (aucune notification pour les statuts internes). */
export async function notifyDemandeStatusChange(
  db: Db,
  params: {
    userId: string;
    demandeId: string;
    dossierNumber: string;
    serviceName?: string | null;
    status: string;
    agentComment?: string | null;
  }
): Promise<{ title: string; body: string } | null> {
  const msg = demandeStatusMessage(params.status, params);
  if (!msg) return null;
  await createNotification(db, {
    userId: params.userId,
    type: "DEMANDE",
    title: msg.title,
    body: msg.body,
    payload: { demandeId: params.demandeId, status: params.status },
    actionUrl: demandeActionUrl(params.demandeId),
    email: DEMANDE_EMAIL_STATUSES.has(params.status)
      ? { subject: `${msg.title} — dossier ${params.dossierNumber}`, actionLabel: "Voir ma demande" }
      : undefined,
  });
  return { title: msg.title, body: msg.body };
}
