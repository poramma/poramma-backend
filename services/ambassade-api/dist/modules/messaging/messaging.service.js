"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertParticipant = assertParticipant;
exports.listThreads = listThreads;
exports.getThread = getThread;
exports.createThread = createThread;
exports.addParticipant = addParticipant;
exports.updateThreadStatus = updateThreadStatus;
exports.listMessages = listMessages;
exports.sendMessage = sendMessage;
exports.markThreadRead = markThreadRead;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_messaging_1 = require("../../db/schema.messaging");
const schema_documents_1 = require("../../db/schema.documents");
const schema_communication_1 = require("../../db/schema.communication");
const storage_1 = require("@poramma/storage");
const utils_1 = require("@poramma/utils");
const enrich_1 = require("../../shared/enrich");
const audit_service_1 = require("../audit/audit.service");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
async function userSummary(userId) {
    const user = await (0, enrich_1.getUser)(userId);
    return {
        id: userId,
        name: user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : "Utilisateur",
    };
}
async function assertParticipant(threadId, userId) {
    const [row] = await connection_1.db
        .select({ id: schema_messaging_1.threadParticipants.id })
        .from(schema_messaging_1.threadParticipants)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.threadId, threadId), (0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.userId, userId)));
    if (!row)
        throw new utils_1.ForbiddenError("Vous ne participez pas à cette conversation");
}
async function enrichThread(row, callerId) {
    const participantRows = await connection_1.db.select().from(schema_messaging_1.threadParticipants).where((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.threadId, row.id));
    const participants = await Promise.all(participantRows.map(async (p) => ({
        id: p.id,
        threadId: p.threadId,
        userId: p.userId,
        userName: (await userSummary(p.userId)).name,
        role: p.role,
        joinedAt: p.joinedAt,
    })));
    const [lastMessageRow] = await connection_1.db
        .select()
        .from(schema_messaging_1.messages)
        .where((0, drizzle_orm_1.eq)(schema_messaging_1.messages.threadId, row.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_messaging_1.messages.createdAt))
        .limit(1);
    const caller = participantRows.find((p) => p.userId === callerId);
    let unreadCount = 0;
    if (caller) {
        const unread = await connection_1.db
            .select({ id: schema_messaging_1.messages.id })
            .from(schema_messaging_1.messages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_messaging_1.messages.threadId, row.id), (0, drizzle_orm_1.ne)(schema_messaging_1.messages.senderId, callerId), caller.lastReadAt ? (0, drizzle_orm_1.gt)(schema_messaging_1.messages.createdAt, caller.lastReadAt) : undefined));
        unreadCount = unread.length;
    }
    return {
        ...row,
        participants,
        lastMessage: lastMessageRow ? await enrichMessage(lastMessageRow) : null,
        unreadCount,
    };
}
async function enrichMessage(row) {
    const sender = await userSummary(row.senderId);
    const attachmentIds = row.attachments ?? [];
    const attachments = attachmentIds.length
        ? await connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.inArray)(schema_documents_1.storedFiles.id, attachmentIds))
        : [];
    return {
        id: row.id,
        threadId: row.threadId,
        senderId: row.senderId,
        senderName: sender.name,
        senderRole: "AGENT",
        body: row.body,
        attachments: attachments.map((f) => ({ ...f, encryptionKeyId: null })),
        status: "SENT",
        readAt: null,
        createdAt: row.createdAt,
    };
}
async function listThreads(userId, demandeId) {
    const myThreadIds = await connection_1.db
        .select({ threadId: schema_messaging_1.threadParticipants.threadId })
        .from(schema_messaging_1.threadParticipants)
        .where((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.userId, userId));
    const ids = myThreadIds.map((r) => r.threadId);
    if (ids.length === 0)
        return [];
    const conditions = [(0, drizzle_orm_1.inArray)(schema_messaging_1.threads.id, ids)];
    if (demandeId)
        conditions.push((0, drizzle_orm_1.eq)(schema_messaging_1.threads.demandeId, demandeId));
    const rows = await connection_1.db
        .select()
        .from(schema_messaging_1.threads)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_messaging_1.threads.createdAt));
    return Promise.all(rows.map((r) => enrichThread(r, userId)));
}
async function getThread(id, callerId) {
    const [row] = await connection_1.db.select().from(schema_messaging_1.threads).where((0, drizzle_orm_1.eq)(schema_messaging_1.threads.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Conversation introuvable");
    return enrichThread(row, callerId);
}
async function createThread(data, actor) {
    const [thread] = await connection_1.db
        .insert(schema_messaging_1.threads)
        .values({
        id: newId("thread"),
        demandeId: data.demandeId ?? null,
        subject: data.subject,
        type: data.demandeId ? "DEMANDE" : "GENERAL",
        status: "OPEN",
        createdBy: actor.userId,
    })
        .returning();
    const participantUserIds = Array.from(new Set([actor.userId, ...data.participantIds]));
    await connection_1.db.insert(schema_messaging_1.threadParticipants).values(participantUserIds.map((userId) => ({
        id: newId("tpart"),
        threadId: thread.id,
        userId,
        role: userId === actor.userId ? "OWNER" : "AGENT",
    })));
    await (0, audit_service_1.writeAudit)({
        action: "CREATE",
        entityType: "THREAD",
        entityId: thread.id,
        actor,
        details: { subject: data.subject, participants: participantUserIds.length },
    });
    return enrichThread(thread, actor.userId);
}
async function addParticipant(threadId, userId) {
    const [thread] = await connection_1.db.select().from(schema_messaging_1.threads).where((0, drizzle_orm_1.eq)(schema_messaging_1.threads.id, threadId));
    if (!thread)
        throw new utils_1.NotFoundError("Conversation introuvable");
    const [existing] = await connection_1.db
        .select({ id: schema_messaging_1.threadParticipants.id })
        .from(schema_messaging_1.threadParticipants)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.threadId, threadId), (0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.userId, userId)));
    if (existing)
        return enrichThread(thread, userId);
    await connection_1.db.insert(schema_messaging_1.threadParticipants).values({ id: newId("tpart"), threadId, userId, role: "AGENT" });
    return enrichThread(thread, userId);
}
async function updateThreadStatus(threadId, status) {
    const [existing] = await connection_1.db.select().from(schema_messaging_1.threads).where((0, drizzle_orm_1.eq)(schema_messaging_1.threads.id, threadId));
    if (!existing)
        throw new utils_1.NotFoundError("Conversation introuvable");
    const [updated] = await connection_1.db
        .update(schema_messaging_1.threads)
        .set({ status, closedAt: status === "OPEN" ? null : new Date() })
        .where((0, drizzle_orm_1.eq)(schema_messaging_1.threads.id, threadId))
        .returning();
    return enrichThread(updated, existing.createdBy);
}
async function listMessages(threadId) {
    const rows = await connection_1.db.select().from(schema_messaging_1.messages).where((0, drizzle_orm_1.eq)(schema_messaging_1.messages.threadId, threadId)).orderBy(schema_messaging_1.messages.createdAt);
    return Promise.all(rows.map(enrichMessage));
}
async function sendMessage(threadId, senderId, body, files) {
    const [thread] = await connection_1.db.select().from(schema_messaging_1.threads).where((0, drizzle_orm_1.eq)(schema_messaging_1.threads.id, threadId));
    if (!thread)
        throw new utils_1.NotFoundError("Conversation introuvable");
    const attachmentIds = [];
    for (const file of files) {
        const fileId = newId("file");
        const key = `messages/${threadId}/${sanitizeFilename(file.originalname)}`;
        await (0, storage_1.uploadObject)(key, file.buffer, file.mimetype);
        await connection_1.db.insert(schema_documents_1.storedFiles).values({
            id: fileId,
            path: key,
            mimeType: file.mimetype,
            originalName: file.originalname,
            checksum: crypto_1.default.createHash("sha256").update(file.buffer).digest("hex"),
            size: file.buffer.length,
            uploadedBy: senderId,
        });
        attachmentIds.push(fileId);
    }
    const [message] = await connection_1.db
        .insert(schema_messaging_1.messages)
        .values({ id: newId("msg"), threadId, senderId, body, attachments: attachmentIds })
        .returning();
    const participants = await connection_1.db
        .select({ userId: schema_messaging_1.threadParticipants.userId })
        .from(schema_messaging_1.threadParticipants)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.threadId, threadId), (0, drizzle_orm_1.ne)(schema_messaging_1.threadParticipants.userId, senderId)));
    const sender = await userSummary(senderId);
    await Promise.all(participants.map((p) => connection_1.db.insert(schema_communication_1.notifications).values({
        id: newId("notif"),
        userId: p.userId,
        type: "MESSAGE",
        title: `Nouveau message de ${sender.name}`,
        body: body.slice(0, 200),
        payload: { threadId },
        channel: "IN_APP",
        status: "SENT",
        actionUrl: `/communication/messages/${threadId}`,
        sentAt: new Date(),
    })));
    return enrichMessage(message);
}
async function markThreadRead(threadId, userId) {
    await connection_1.db
        .update(schema_messaging_1.threadParticipants)
        .set({ lastReadAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.threadId, threadId), (0, drizzle_orm_1.eq)(schema_messaging_1.threadParticipants.userId, userId)));
}
//# sourceMappingURL=messaging.service.js.map