"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BANNER_ITEMS = void 0;
exports.listCampagnes = listCampagnes;
exports.getCampagne = getCampagne;
exports.createCampagne = createCampagne;
exports.updateCampagne = updateCampagne;
exports.sendCampagne = sendCampagne;
exports.scheduleCampagne = scheduleCampagne;
exports.processDueScheduledCampagnes = processDueScheduledCampagnes;
exports.startCampagneScheduler = startCampagneScheduler;
exports.cancelCampagne = cancelCampagne;
exports.duplicateCampagne = duplicateCampagne;
exports.listDeliveries = listDeliveries;
exports.resendToFailed = resendToFailed;
exports.uploadAttachment = uploadAttachment;
exports.updateAttachment = updateAttachment;
exports.getCampagneFile = getCampagneFile;
exports.removeAttachment = removeAttachment;
exports.reorderAttachments = reorderAttachments;
exports.estimateRecipients = estimateRecipients;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_communication_1 = require("../../db/schema.communication");
const schema_documents_1 = require("../../db/schema.documents");
const storage_1 = require("@poramma/storage");
const mailer_1 = require("@poramma/mailer");
const ambassade_core_1 = require("@poramma/ambassade-core");
const utils_1 = require("@poramma/utils");
const enrich_1 = require("../../shared/enrich");
const sanitize_html_1 = require("../../shared/sanitize-html");
const schema_identity_readonly_1 = require("../../db/schema.identity-readonly");
const audit_service_1 = require("../audit/audit.service");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function publicAppUrl() {
    return (process.env.PUBLIC_APP_URL || "http://localhost:5174").replace(/\/$/, "");
}
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
async function enrichCampagne(row) {
    const [coverImage, attachmentRows, sentByUser] = await Promise.all([
        row.coverImageId
            ? connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, row.coverImageId)).then((r) => r[0] ?? null)
            : Promise.resolve(null),
        connection_1.db.select().from(schema_communication_1.campagneAttachments).where((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, row.id)).orderBy(schema_communication_1.campagneAttachments.order),
        (0, enrich_1.getUser)(row.sentBy),
    ]);
    const attachments = await Promise.all(attachmentRows.map(async (a) => {
        const [file] = await connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, a.fileId));
        return { ...a, file: file ? { ...file, encryptionKeyId: null } : null };
    }));
    const interactions = (await ambassade_core_1.campagnesLogic.interactionStats(connection_1.db, [row.id])).get(row.id);
    const sent = row.statsSent;
    const openRate = sent > 0 ? Math.round((row.statsOpened / sent) * 1000) / 10 : 0;
    const clickRate = sent > 0 ? Math.round((row.statsClicked / sent) * 1000) / 10 : 0;
    return {
        ...row,
        coverImage: coverImage ? { ...coverImage, encryptionKeyId: null } : null,
        attachments,
        sentByUser,
        targetFilters: row.targetFilters ?? {},
        stats: {
            totalRecipients: row.statsTotalRecipients,
            sent: row.statsSent,
            delivered: row.statsDelivered,
            opened: row.statsOpened,
            clicked: row.statsClicked,
            failed: row.statsFailed,
            openRate,
            clickRate,
        },
        interactions,
    };
}
async function listCampagnes(query) {
    const conditions = [];
    if (query.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.status, query.status));
    if (query.type)
        conditions.push((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.type, query.type));
    const rows = await connection_1.db
        .select()
        .from(schema_communication_1.campagnes)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema_communication_1.campagnes.createdAt));
    return Promise.all(rows.map(enrichCampagne));
}
async function getCampagne(id) {
    const [row] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Campagne introuvable");
    return enrichCampagne(row);
}
async function createCampagne(data, actor) {
    const [row] = await connection_1.db
        .insert(schema_communication_1.campagnes)
        .values({
        id: newId("camp"),
        title: data.title,
        content: (0, sanitize_html_1.sanitizeCampaignContent)(data.content),
        type: data.type,
        coverImageId: data.coverImageFileId ?? null,
        targetFilters: data.targetFilters,
        channels: data.channels,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
        sentBy: actor.userId,
    })
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "CREATE",
        entityType: "CAMPAGNE",
        entityId: row.id,
        actor,
        entitySnapshot: { title: row.title, type: row.type },
    });
    return enrichCampagne(row);
}
async function updateCampagne(id, data) {
    const [existing] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Campagne introuvable");
    if (existing.status === "SENT" || existing.status === "SENDING") {
        throw new utils_1.ValidationError("Une campagne déjà envoyée ne peut plus être modifiée", { status: ["locked"] });
    }
    const { coverImageFileId, scheduledAt, ...rest } = data;
    if (rest.content !== undefined)
        rest.content = (0, sanitize_html_1.sanitizeCampaignContent)(rest.content);
    const [updated] = await connection_1.db
        .update(schema_communication_1.campagnes)
        .set({
        ...rest,
        ...(coverImageFileId !== undefined ? { coverImageId: coverImageFileId } : {}),
        ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
    })
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id))
        .returning();
    return enrichCampagne(updated);
}
async function dispatchToRecipient(campagne, userId, channel) {
    const deliveryId = newId("del");
    const base = { id: deliveryId, campagneId: campagne.id, userId, channel };
    if (channel === "EMAIL") {
        const user = await (0, enrich_1.getUser)(userId);
        if (!user?.email) {
            await connection_1.db.insert(schema_communication_1.campagneDeliveries).values({ ...base, status: "FAILED", errorMessage: "Adresse email introuvable" });
            return "FAILED";
        }
        try {
            await (0, mailer_1.sendMail)({
                to: user.email,
                subject: campagne.title,
                html: (0, mailer_1.renderEmail)({
                    title: campagne.title,
                    rawHtml: (0, sanitize_html_1.sanitizeCampaignContent)(campagne.content),
                    action: { label: "Lire sur le portail", url: `${publicAppUrl()}/campagnes/${campagne.id}` },
                }),
            });
            await connection_1.db.insert(schema_communication_1.campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date() });
            return "SENT";
        }
        catch (err) {
            await connection_1.db.insert(schema_communication_1.campagneDeliveries).values({ ...base, status: "FAILED", errorMessage: err.message });
            return "FAILED";
        }
    }
    if (channel === "IN_APP") {
        await connection_1.db.insert(schema_communication_1.notifications).values({
            id: newId("notif"),
            userId,
            type: "CAMPAGNE",
            title: campagne.title,
            body: campagne.content.replace(/<[^>]+>/g, "").slice(0, 500),
            payload: { campagneId: campagne.id },
            channel: "IN_APP",
            status: "SENT",
            actionUrl: `/campagnes/${campagne.id}`,
            sentAt: new Date(),
        });
        await connection_1.db.insert(schema_communication_1.campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date(), deliveredAt: new Date() });
        return "SENT";
    }
    await connection_1.db.insert(schema_communication_1.campagneDeliveries).values({ ...base, status: "SENT", sentAt: new Date() });
    return "SENT";
}
async function notifySender(campagne, title, body) {
    await connection_1.db.insert(schema_communication_1.notifications).values({
        id: newId("notif"),
        userId: campagne.sentBy,
        type: "CAMPAGNE",
        title,
        body,
        payload: { campagneId: campagne.id },
        channel: "IN_APP",
        status: "SENT",
        actionUrl: `/communication/campagnes/${campagne.id}`,
        sentAt: new Date(),
    });
}
async function performSend(existing, actor, automatic) {
    await connection_1.db.update(schema_communication_1.campagnes).set({ status: "SENDING" }).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, existing.id));
    const targetUserIds = await (0, schema_identity_readonly_1.resolveTargetUserIds)(existing.targetFilters ?? {});
    const channels = existing.channels ?? ["IN_APP"];
    let sentCount = 0;
    let failedCount = 0;
    for (const userId of targetUserIds) {
        for (const channel of channels) {
            const result = await dispatchToRecipient(existing, userId, channel);
            if (result === "SENT")
                sentCount++;
            else
                failedCount++;
        }
    }
    const [updated] = await connection_1.db
        .update(schema_communication_1.campagnes)
        .set({
        status: "SENT",
        sentAt: new Date(),
        statsTotalRecipients: targetUserIds.length,
        statsSent: sentCount,
        statsDelivered: sentCount,
        statsFailed: failedCount,
    })
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, existing.id))
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "SEND",
        entityType: "CAMPAGNE",
        entityId: existing.id,
        actor,
        severity: "WARNING",
        details: { recipients: targetUserIds.length, sent: sentCount, failed: failedCount, automatic },
    });
    await notifySender(updated, automatic ? "Campagne envoyée automatiquement" : "Campagne envoyée", `« ${updated.title} » a été envoyée à ${targetUserIds.length} destinataire${targetUserIds.length > 1 ? "s" : ""}.`);
    return enrichCampagne(updated);
}
async function sendCampagne(id, actor) {
    const [existing] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Campagne introuvable");
    if (existing.status === "SENT" || existing.status === "SENDING") {
        throw new utils_1.ValidationError("Cette campagne a déjà été envoyée", { status: ["already sent"] });
    }
    return performSend(existing, actor, false);
}
async function scheduleCampagne(id, scheduledAt) {
    const [existing] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Campagne introuvable");
    if (existing.status === "SENT" || existing.status === "SENDING") {
        throw new utils_1.ValidationError("Cette campagne a déjà été envoyée", { status: ["already sent"] });
    }
    const [updated] = await connection_1.db
        .update(schema_communication_1.campagnes)
        .set({ status: "SCHEDULED", scheduledAt: new Date(scheduledAt) })
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id))
        .returning();
    await notifySender(updated, "Campagne programmée", `« ${updated.title} » est programmée pour le ${new Date(scheduledAt).toLocaleString("fr-FR")}.`);
    return enrichCampagne(updated);
}
async function processDueScheduledCampagnes() {
    const due = await connection_1.db
        .select()
        .from(schema_communication_1.campagnes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.status, "SCHEDULED"), (0, drizzle_orm_1.lte)(schema_communication_1.campagnes.scheduledAt, new Date())));
    for (const campagne of due) {
        try {
            await performSend(campagne, { userId: campagne.sentBy, roleName: null }, true);
        }
        catch (err) {
            console.error(`[campagne-scheduler] Échec de l'envoi automatique de ${campagne.id}:`, err);
        }
    }
}
function startCampagneScheduler() {
    processDueScheduledCampagnes().catch((err) => console.error("[campagne-scheduler] Vérification initiale échouée:", err));
    setInterval(() => {
        processDueScheduledCampagnes().catch((err) => console.error("[campagne-scheduler] Vérification périodique échouée:", err));
    }, 60_000);
}
async function cancelCampagne(id) {
    const [existing] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Campagne introuvable");
    if (existing.status !== "SCHEDULED") {
        throw new utils_1.ValidationError("Seule une campagne programmée peut être annulée", { status: ["not scheduled"] });
    }
    const [updated] = await connection_1.db
        .update(schema_communication_1.campagnes)
        .set({ status: "CANCELLED", scheduledAt: null })
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id))
        .returning();
    return enrichCampagne(updated);
}
async function duplicateCampagne(id, actor) {
    const [source] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, id));
    if (!source)
        throw new utils_1.NotFoundError("Campagne introuvable");
    const [copy] = await connection_1.db
        .insert(schema_communication_1.campagnes)
        .values({
        id: newId("camp"),
        title: `${source.title} (copie)`,
        content: source.content,
        type: source.type,
        coverImageId: source.coverImageId,
        targetFilters: source.targetFilters,
        channels: source.channels,
        status: "DRAFT",
        sentBy: actor.userId,
    })
        .returning();
    const sourceAttachments = await connection_1.db.select().from(schema_communication_1.campagneAttachments).where((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, id)).orderBy(schema_communication_1.campagneAttachments.order);
    if (sourceAttachments.length) {
        await connection_1.db.insert(schema_communication_1.campagneAttachments).values(sourceAttachments.map((a) => ({
            id: newId("att"),
            campagneId: copy.id,
            fileId: a.fileId,
            type: a.type,
            order: a.order,
            caption: a.caption,
            isBanner: a.isBanner,
        })));
    }
    return enrichCampagne(copy);
}
async function listDeliveries(campagneId) {
    const rows = await connection_1.db.select().from(schema_communication_1.campagneDeliveries).where((0, drizzle_orm_1.eq)(schema_communication_1.campagneDeliveries.campagneId, campagneId)).orderBy((0, drizzle_orm_1.desc)(schema_communication_1.campagneDeliveries.sentAt));
    return Promise.all(rows.map(async (d) => {
        const user = await (0, enrich_1.getUser)(d.userId);
        const userName = user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : undefined;
        return { ...d, userName };
    }));
}
async function resendToFailed(campagneId) {
    const [campagne] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, campagneId));
    if (!campagne)
        throw new utils_1.NotFoundError("Campagne introuvable");
    const failed = await connection_1.db
        .select()
        .from(schema_communication_1.campagneDeliveries)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneDeliveries.campagneId, campagneId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneDeliveries.status, "FAILED")));
    let recovered = 0;
    for (const delivery of failed) {
        const result = await dispatchToRecipient(campagne, delivery.userId, delivery.channel);
        if (result === "SENT") {
            await connection_1.db.delete(schema_communication_1.campagneDeliveries).where((0, drizzle_orm_1.eq)(schema_communication_1.campagneDeliveries.id, delivery.id));
            recovered++;
        }
    }
    if (recovered > 0) {
        await connection_1.db
            .update(schema_communication_1.campagnes)
            .set({ statsSent: campagne.statsSent + recovered, statsFailed: Math.max(0, campagne.statsFailed - recovered) })
            .where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, campagneId));
    }
    return { recovered, remaining: failed.length - recovered };
}
exports.MAX_BANNER_ITEMS = 8;
async function assertCanBeBanner(campagneId, attachmentType, excludeAttachmentId) {
    if (attachmentType !== "IMAGE" && attachmentType !== "VIDEO") {
        throw new utils_1.ValidationError("Seules les images et les vidéos peuvent servir de bannière.", { isBanner: ["not an image or video"] });
    }
    const current = await connection_1.db
        .select({ id: schema_communication_1.campagneAttachments.id })
        .from(schema_communication_1.campagneAttachments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.isBanner, true)));
    if (current.filter((a) => a.id !== excludeAttachmentId).length >= exports.MAX_BANNER_ITEMS) {
        throw new utils_1.ValidationError(`Le carrousel est limité à ${exports.MAX_BANNER_ITEMS} médias.`, { isBanner: ["too many banner items"] });
    }
}
async function uploadAttachment(campagneId, fileBuffer, originalName, mimeType, data, actor) {
    const [campagne] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, campagneId));
    if (!campagne)
        throw new utils_1.NotFoundError("Campagne introuvable");
    if (data.isBanner)
        await assertCanBeBanner(campagneId, data.type);
    const fileId = newId("file");
    const key = `campagnes/${campagneId}/${sanitizeFilename(originalName)}`;
    await (0, storage_1.uploadObject)(key, fileBuffer, mimeType);
    const [file] = await connection_1.db
        .insert(schema_documents_1.storedFiles)
        .values({
        id: fileId,
        path: key,
        mimeType,
        originalName,
        checksum: crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex"),
        size: fileBuffer.length,
        uploadedBy: actor.userId,
    })
        .returning();
    const [maxOrderRow] = await connection_1.db
        .select({ order: schema_communication_1.campagneAttachments.order })
        .from(schema_communication_1.campagneAttachments)
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId))
        .orderBy((0, drizzle_orm_1.desc)(schema_communication_1.campagneAttachments.order))
        .limit(1);
    const [attachment] = await connection_1.db
        .insert(schema_communication_1.campagneAttachments)
        .values({
        id: newId("att"),
        campagneId,
        fileId: file.id,
        type: data.type,
        order: (maxOrderRow?.order ?? -1) + 1,
        caption: data.caption ?? null,
        isBanner: data.isBanner ?? false,
    })
        .returning();
    return { ...attachment, file: { ...file, encryptionKeyId: null } };
}
async function updateAttachment(campagneId, attachmentId, patch) {
    const [existing] = await connection_1.db
        .select()
        .from(schema_communication_1.campagneAttachments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.id, attachmentId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId)));
    if (!existing)
        throw new utils_1.NotFoundError("Pièce jointe introuvable");
    if (patch.isBanner && !existing.isBanner)
        await assertCanBeBanner(campagneId, existing.type, attachmentId);
    const [updated] = await connection_1.db
        .update(schema_communication_1.campagneAttachments)
        .set({
        ...(patch.isBanner !== undefined ? { isBanner: patch.isBanner } : {}),
        ...(patch.caption !== undefined ? { caption: patch.caption?.trim() || null } : {}),
    })
        .where((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.id, attachmentId))
        .returning();
    const [file] = await connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, updated.fileId));
    return { ...updated, file: file ? { ...file, encryptionKeyId: null } : null };
}
async function getCampagneFile(campagneId, fileId) {
    const [campagne] = await connection_1.db.select().from(schema_communication_1.campagnes).where((0, drizzle_orm_1.eq)(schema_communication_1.campagnes.id, campagneId));
    if (!campagne)
        throw new utils_1.NotFoundError("Campagne introuvable");
    const belongsToCampagne = campagne.coverImageId === fileId ||
        (await connection_1.db.select().from(schema_communication_1.campagneAttachments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.fileId, fileId)))).length > 0;
    if (!belongsToCampagne)
        throw new utils_1.NotFoundError("Fichier introuvable");
    const [file] = await connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, fileId));
    if (!file)
        throw new utils_1.NotFoundError("Fichier introuvable");
    const { buffer, contentType } = await (0, storage_1.getObject)(file.path);
    return { buffer, contentType: contentType ?? file.mimeType, filename: file.originalName };
}
async function removeAttachment(campagneId, attachmentId) {
    const [existing] = await connection_1.db
        .select()
        .from(schema_communication_1.campagneAttachments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.id, attachmentId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId)));
    if (!existing)
        throw new utils_1.NotFoundError("Pièce jointe introuvable");
    await connection_1.db.delete(schema_communication_1.campagneAttachments).where((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.id, attachmentId));
}
async function reorderAttachments(campagneId, orderedAttachmentIds) {
    await Promise.all(orderedAttachmentIds.map((attachmentId, index) => connection_1.db
        .update(schema_communication_1.campagneAttachments)
        .set({ order: index })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.id, attachmentId), (0, drizzle_orm_1.eq)(schema_communication_1.campagneAttachments.campagneId, campagneId)))));
}
async function estimateRecipients(filters) {
    const userIds = await (0, schema_identity_readonly_1.resolveTargetUserIds)(filters);
    const breakdown = {};
    if (filters.cities?.length && userIds.length) {
        const profiles = await connection_1.db
            .select({ city: schema_identity_readonly_1.identityUserProfiles.city })
            .from(schema_identity_readonly_1.identityUserProfiles)
            .where((0, drizzle_orm_1.inArray)(schema_identity_readonly_1.identityUserProfiles.userId, userIds));
        breakdown.byCity = profiles.reduce((acc, p) => {
            const city = p.city ?? "Inconnu";
            acc[city] = (acc[city] ?? 0) + 1;
            return acc;
        }, {});
    }
    return { estimatedCount: userIds.length, breakdown };
}
//# sourceMappingURL=communication.service.js.map