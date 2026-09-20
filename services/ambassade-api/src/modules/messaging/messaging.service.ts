import crypto from "crypto";
import { eq, and, desc, gt, ne, inArray } from "drizzle-orm";
import { db } from "../../db/connection";
import { threads, threadParticipants, messages } from "../../db/schema.messaging";
import { storedFiles } from "../../db/schema.documents";
import { notifications } from "../../db/schema.communication";
import { uploadObject } from "@poramma/storage";
import { NotFoundError, ForbiddenError } from "@poramma/utils";
import { getUser } from "../../shared/enrich";
import { writeAudit } from "../audit/audit.service";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

interface Actor {
  userId: string;
  roleName: string | null;
}

async function userSummary(userId: string) {
  const user = await getUser(userId);
  return {
    id: userId,
    name: user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : "Utilisateur",
  };
}

/** Lève ForbiddenError si l'appelant n'est pas participant du thread — la messagerie interne n'a pas de carte blanche ADMIN, voir schema.messaging.ts. */
export async function assertParticipant(threadId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: threadParticipants.id })
    .from(threadParticipants)
    .where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
  if (!row) throw new ForbiddenError("Vous ne participez pas à cette conversation");
}

async function enrichThread(row: typeof threads.$inferSelect, callerId: string) {
  const participantRows = await db.select().from(threadParticipants).where(eq(threadParticipants.threadId, row.id));
  const participants = await Promise.all(
    participantRows.map(async (p) => ({
      id: p.id,
      threadId: p.threadId,
      userId: p.userId,
      userName: (await userSummary(p.userId)).name,
      role: p.role,
      joinedAt: p.joinedAt,
    }))
  );

  const [lastMessageRow] = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, row.id))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  const caller = participantRows.find((p) => p.userId === callerId);
  let unreadCount = 0;
  if (caller) {
    const unread = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.threadId, row.id),
          ne(messages.senderId, callerId),
          caller.lastReadAt ? gt(messages.createdAt, caller.lastReadAt) : undefined
        )
      );
    unreadCount = unread.length;
  }

  return {
    ...row,
    participants,
    lastMessage: lastMessageRow ? await enrichMessage(lastMessageRow) : null,
    unreadCount,
  };
}

async function enrichMessage(row: typeof messages.$inferSelect) {
  const sender = await userSummary(row.senderId);
  const attachmentIds = (row.attachments as string[] | null) ?? [];
  const attachments = attachmentIds.length
    ? await db.select().from(storedFiles).where(inArray(storedFiles.id, attachmentIds))
    : [];
  return {
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderId,
    senderName: sender.name,
    // Toujours AGENT : la messagerie interne est staff-only (voir
    // schema.messaging.ts), STUDENT/SYSTEM restent dans le type frontend
    // pour une éventuelle extension future, jamais produits ici.
    senderRole: "AGENT" as const,
    body: row.body,
    attachments: attachments.map((f) => ({ ...f, encryptionKeyId: null })),
    // Pas de statut de lecture par message (ambigu à plusieurs
    // participants, voir thread_participants.lastReadAt) — toujours SENT.
    status: "SENT" as const,
    readAt: null,
    createdAt: row.createdAt,
  };
}

/** Threads où l'appelant participe — jamais une vue globale, voir schema.messaging.ts. */
export async function listThreads(userId: string, demandeId?: string) {
  const myThreadIds = await db
    .select({ threadId: threadParticipants.threadId })
    .from(threadParticipants)
    .where(eq(threadParticipants.userId, userId));
  const ids = myThreadIds.map((r) => r.threadId);
  if (ids.length === 0) return [];

  const conditions = [inArray(threads.id, ids)];
  if (demandeId) conditions.push(eq(threads.demandeId, demandeId));

  const rows = await db
    .select()
    .from(threads)
    .where(and(...conditions))
    .orderBy(desc(threads.createdAt));

  return Promise.all(rows.map((r) => enrichThread(r, userId)));
}

export async function getThread(id: string, callerId: string) {
  const [row] = await db.select().from(threads).where(eq(threads.id, id));
  if (!row) throw new NotFoundError("Conversation introuvable");
  return enrichThread(row, callerId);
}

export async function createThread(
  data: { demandeId?: string; subject: string; participantIds: string[] },
  actor: Actor
) {
  const [thread] = await db
    .insert(threads)
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
  await db.insert(threadParticipants).values(
    participantUserIds.map((userId) => ({
      id: newId("tpart"),
      threadId: thread.id,
      userId,
      role: userId === actor.userId ? "OWNER" : "AGENT",
    }))
  );

  await writeAudit({
    action: "CREATE",
    entityType: "THREAD",
    entityId: thread.id,
    actor,
    details: { subject: data.subject, participants: participantUserIds.length },
  });

  return enrichThread(thread, actor.userId);
}

export async function addParticipant(threadId: string, userId: string) {
  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId));
  if (!thread) throw new NotFoundError("Conversation introuvable");

  const [existing] = await db
    .select({ id: threadParticipants.id })
    .from(threadParticipants)
    .where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
  if (existing) return enrichThread(thread, userId);

  await db.insert(threadParticipants).values({ id: newId("tpart"), threadId, userId, role: "AGENT" });
  return enrichThread(thread, userId);
}

export async function updateThreadStatus(threadId: string, status: string) {
  const [existing] = await db.select().from(threads).where(eq(threads.id, threadId));
  if (!existing) throw new NotFoundError("Conversation introuvable");

  const [updated] = await db
    .update(threads)
    .set({ status, closedAt: status === "OPEN" ? null : new Date() })
    .where(eq(threads.id, threadId))
    .returning();
  return enrichThread(updated, existing.createdBy);
}

export async function listMessages(threadId: string) {
  const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.createdAt);
  return Promise.all(rows.map(enrichMessage));
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string,
  files: { buffer: Buffer; originalname: string; mimetype: string }[]
) {
  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId));
  if (!thread) throw new NotFoundError("Conversation introuvable");

  const attachmentIds: string[] = [];
  for (const file of files) {
    const fileId = newId("file");
    const key = `messages/${threadId}/${sanitizeFilename(file.originalname)}`;
    await uploadObject(key, file.buffer, file.mimetype);
    await db.insert(storedFiles).values({
      id: fileId,
      path: key,
      mimeType: file.mimetype,
      originalName: file.originalname,
      checksum: crypto.createHash("sha256").update(file.buffer).digest("hex"),
      size: file.buffer.length,
      uploadedBy: senderId,
    });
    attachmentIds.push(fileId);
  }

  const [message] = await db
    .insert(messages)
    .values({ id: newId("msg"), threadId, senderId, body, attachments: attachmentIds })
    .returning();

  // Notifie les AUTRES participants (voir Phase 8's notification pattern) —
  // pas l'expéditeur lui-même, pas d'audit par message (trop bruyant, voir
  // le commentaire de schema.messaging.ts).
  const participants = await db
    .select({ userId: threadParticipants.userId })
    .from(threadParticipants)
    .where(and(eq(threadParticipants.threadId, threadId), ne(threadParticipants.userId, senderId)));
  const sender = await userSummary(senderId);
  await Promise.all(
    participants.map((p) =>
      db.insert(notifications).values({
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
      })
    )
  );

  return enrichMessage(message);
}

export async function markThreadRead(threadId: string, userId: string) {
  await db
    .update(threadParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
}
