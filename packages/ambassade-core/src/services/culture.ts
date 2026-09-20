import crypto from "crypto";
import { and, desc, eq, ilike, inArray, or, sql, SQL } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@poramma/utils";
import type { Db } from "../db-type";
import { cultureThreads, cultureMessages } from "../schema/culture";
import { services, subServices } from "../schema/services";
import { identityAgents, identityRoles, identityUserRoles, identityUsers, identityUserProfiles } from "../schema/identity";
import { getActorName, getUser, getUsersByIds } from "./identity";
import { createNotification } from "./notifications";

/** Rôle du Conseiller Culturel (agent spécial, à visage découvert). */
export const CULTURE_ROLE = "CULTURAL_ADVISOR";
const DEFAULT_TITLE = "Conseiller Culturel";

type Thread = typeof cultureThreads.$inferSelect;
type Message = typeof cultureMessages.$inferSelect;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const excerpt = (text: string, max = 220) => (text.length > max ? `${text.slice(0, max)}…` : text);

async function newReference(db: Db): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const reference = `CUL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const [clash] = await db.select({ id: cultureThreads.id }).from(cultureThreads).where(eq(cultureThreads.reference, reference));
    if (!clash) return reference;
  }
  throw new ConflictError("Impossible de générer un numéro d'échange, réessayez.");
}

// ── Le Conseiller Culturel ───────────────────────────────────────────────

export interface Advisor {
  userId: string;
  agentId: string;
  name: string;
  title: string;
}

/** Conseillers culturels actifs (rôle actif + fiche agent active). */
export async function listAdvisors(db: Db): Promise<Advisor[]> {
  const rows = await db
    .select({ userId: identityAgents.userId, agentId: identityAgents.id, roleTitle: identityAgents.roleTitle })
    .from(identityUserRoles)
    .innerJoin(identityRoles, eq(identityRoles.id, identityUserRoles.roleId))
    .innerJoin(identityAgents, eq(identityAgents.userId, identityUserRoles.userId))
    .where(and(eq(identityRoles.name, CULTURE_ROLE), eq(identityUserRoles.isActive, true), eq(identityAgents.active, true)));
  const users = await getUsersByIds(db, rows.map((r) => r.userId));
  return rows
    .map((r) => {
      const p = users.get(r.userId)?.profile;
      const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Conseiller Culturel";
      return { userId: r.userId, agentId: r.agentId, name, title: r.roleTitle?.trim() || DEFAULT_TITLE };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Le conseiller à qui appartient cette fiche agent (assignation d'une demande, agent d'un rendez-vous), s'il en est un. */
export async function advisorByAgentId(db: Db, agentId: string | null | undefined): Promise<Advisor | null> {
  if (!agentId) return null;
  return (await listAdvisors(db)).find((a) => a.agentId === agentId) ?? null;
}

/** Sous-services de l'espace culturel (rendez-vous, demandes). */
export async function culturalSubServiceIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: subServices.id })
    .from(subServices)
    .innerJoin(services, eq(services.id, subServices.serviceId))
    .where(eq(services.isCultural, true));
  return rows.map((r) => r.id);
}

export async function isCulturalSubService(db: Db, subServiceId: string): Promise<boolean> {
  return (await culturalSubServiceIds(db)).includes(subServiceId);
}

async function adminIds(db: Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: identityUserRoles.userId })
    .from(identityUserRoles)
    .innerJoin(identityRoles, eq(identityRoles.id, identityUserRoles.roleId))
    .where(and(eq(identityRoles.name, "ADMIN"), eq(identityUserRoles.isActive, true)));
  return rows.map((r) => r.userId);
}

/** Qui prévenir côté ambassade : les conseillers culturels ; à défaut, les administrateurs. */
export async function cultureStaffIds(db: Db): Promise<string[]> {
  const advisors = (await listAdvisors(db)).map((a) => a.userId);
  return advisors.length ? advisors : adminIds(db);
}

export async function notifyCultureStaff(
  db: Db,
  params: { title: string; body: string; payload?: Record<string, unknown>; actionUrl: string; exceptUserId?: string }
) {
  for (const userId of await cultureStaffIds(db)) {
    if (userId === params.exceptUserId) continue;
    await createNotification(db, {
      userId,
      type: "CULTURE",
      title: params.title,
      body: params.body,
      payload: params.payload ?? null,
      actionUrl: params.actionUrl,
      // Pas de bouton dans l'email : le lien pointerait vers le portail citoyen, pas vers le backoffice.
      email: { subject: params.title },
    });
  }
}

const RDV_EVENT_TITLE: Record<string, string> = {
  BOOKED: "Nouveau rendez-vous",
  RESCHEDULED: "Rendez-vous déplacé",
  CANCELLED: "Rendez-vous annulé",
};

/** Prévient le conseiller quand un membre réserve / déplace / annule un rendez-vous avec lui (sans effet pour un agent consulaire). */
export async function notifyAdvisorRendezVous(
  db: Db,
  params: { agentId: string; event: "BOOKED" | "RESCHEDULED" | "CANCELLED"; userId: string; ticketId: string; date: string; startTime?: string }
) {
  try {
    const advisor = await advisorByAgentId(db, params.agentId);
    if (!advisor) return;
    const name = await getActorName(db, params.userId);
    await createNotification(db, {
      userId: advisor.userId,
      type: "CULTURE",
      title: `${RDV_EVENT_TITLE[params.event]} — ${params.ticketId}`,
      body: `${name} · ${params.date}${params.startTime ? ` à ${params.startTime}` : ""}`,
      payload: { ticketId: params.ticketId },
      actionUrl: "/culture",
    });
  } catch (err) {
    console.error("[culture] notification du conseiller échouée", err);
  }
}

// ── Vue du membre (nom réel du conseiller) ───────────────────────────────

async function advisorDisplay(db: Db, advisorId: string | null) {
  if (!advisorId) return { name: null as string | null, title: DEFAULT_TITLE };
  const [agent] = await db.select({ roleTitle: identityAgents.roleTitle }).from(identityAgents).where(eq(identityAgents.userId, advisorId));
  return { name: await getActorName(db, advisorId), title: agent?.roleTitle?.trim() || DEFAULT_TITLE };
}

function publicThread(t: Thread, advisor: { name: string | null; title: string }) {
  return {
    id: t.id,
    reference: t.reference,
    subject: t.subject,
    status: t.status,
    advisor,
    createdAt: t.createdAt,
    lastMessageAt: t.lastMessageAt,
    lastMessageBy: t.lastMessageBy,
    closedAt: t.closedAt,
  };
}

function publicMessage(m: Message) {
  return {
    id: m.id,
    authorType: m.authorType as "USER" | "ADVISOR" | "SYSTEM",
    authorName: m.authorType === "SYSTEM" ? null : m.authorName,
    content: m.content,
    createdAt: m.createdAt,
  };
}

async function getThreadRow(db: Db, id: string): Promise<Thread> {
  const [row] = await db.select().from(cultureThreads).where(eq(cultureThreads.id, id));
  if (!row) throw new NotFoundError("Échange introuvable");
  return row;
}

async function ownedThread(db: Db, userId: string, id: string): Promise<Thread> {
  const row = await getThreadRow(db, id);
  if (row.userId !== userId) throw new NotFoundError("Échange introuvable"); // ne révèle pas l'existence de l'échange d'autrui
  return row;
}

export async function createThread(db: Db, userId: string, data: { subject: string; message: string }) {
  const id = newId("cth");
  const reference = await newReference(db);
  const name = await getActorName(db, userId);
  const [thread] = await db.insert(cultureThreads).values({ id, reference, userId, subject: data.subject }).returning();
  await db.insert(cultureMessages).values({ id: newId("cmsg"), threadId: id, authorId: userId, authorType: "USER", authorName: name, content: data.message });

  await notifyCultureStaff(db, {
    title: `Nouveau message — ${data.subject}`,
    body: `${name} écrit au Conseiller Culturel (${reference}) :\n\n${excerpt(data.message)}`,
    payload: { cultureThreadId: id, reference },
    actionUrl: `/culture/echanges/${id}`,
  });
  await createNotification(db, {
    userId,
    type: "CULTURE",
    title: "Votre message a bien été transmis",
    body: `Le Conseiller Culturel a reçu « ${data.subject} ». Numéro de suivi : ${reference}. Vous serez prévenu(e) dès sa réponse.`,
    payload: { cultureThreadId: id, reference },
    actionUrl: `/culture/echanges/${id}`,
    email: { subject: `Message transmis au Conseiller Culturel (${reference})`, actionLabel: "Suivre l'échange" },
  });
  return publicThread(thread, await advisorDisplay(db, null));
}

export async function listThreadsForUser(db: Db, userId: string) {
  const rows = await db.select().from(cultureThreads).where(eq(cultureThreads.userId, userId)).orderBy(desc(cultureThreads.lastMessageAt));
  const advisors = new Map<string, { name: string | null; title: string }>();
  for (const id of new Set(rows.map((r) => r.advisorId).filter((x): x is string => !!x))) advisors.set(id, await advisorDisplay(db, id));
  return rows.map((t) => publicThread(t, t.advisorId ? advisors.get(t.advisorId)! : { name: null, title: DEFAULT_TITLE }));
}

export async function getThreadForUser(db: Db, userId: string, id: string) {
  const thread = await ownedThread(db, userId, id);
  const messages = await db
    .select()
    .from(cultureMessages)
    .where(and(eq(cultureMessages.threadId, id), eq(cultureMessages.isInternal, false)))
    .orderBy(cultureMessages.createdAt);
  return { ...publicThread(thread, await advisorDisplay(db, thread.advisorId)), messages: messages.map(publicMessage) };
}

export async function addUserMessage(db: Db, userId: string, id: string, content: string) {
  const thread = await ownedThread(db, userId, id);
  if (thread.status === "CLOSED") throw new ConflictError("Cet échange est clos. Ouvrez un nouvel échange si vous avez encore besoin du Conseiller Culturel.");
  const name = await getActorName(db, userId);
  const [message] = await db
    .insert(cultureMessages)
    .values({ id: newId("cmsg"), threadId: id, authorId: userId, authorType: "USER", authorName: name, content })
    .returning();
  await db.update(cultureThreads).set({ status: "OPEN", lastMessageAt: new Date(), lastMessageBy: "USER", updatedAt: new Date() }).where(eq(cultureThreads.id, id));

  // Le conseiller qui a déjà répondu est prévenu en priorité ; à défaut, tout l'espace culturel.
  if (thread.advisorId) {
    await createNotification(db, {
      userId: thread.advisorId,
      type: "CULTURE",
      title: `Nouvelle réponse — ${thread.subject}`,
      body: `${name} : ${excerpt(content)}`,
      payload: { cultureThreadId: id, reference: thread.reference },
      actionUrl: `/culture/echanges/${id}`,
      email: { subject: `[Culture ${thread.reference}] Nouvelle réponse` },
    });
  } else {
    await notifyCultureStaff(db, {
      title: `Nouvelle réponse — ${thread.subject}`,
      body: `${name} : ${excerpt(content)}`,
      payload: { cultureThreadId: id, reference: thread.reference },
      actionUrl: `/culture/echanges/${id}`,
    });
  }
  return publicMessage(message);
}

// ── Vue de l'ambassade (conseiller culturel, administrateur) ─────────────

async function enrichStaff(db: Db, rows: Thread[]) {
  const users = await getUsersByIds(db, rows.flatMap((t) => [t.userId, t.advisorId].filter((x): x is string => !!x)));
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const u = users.get(id);
    return u ? [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email : null;
  };
  return rows.map((t) => {
    const u = users.get(t.userId);
    return {
      id: t.id,
      reference: t.reference,
      subject: t.subject,
      status: t.status,
      requester: { id: t.userId, name: nameOf(t.userId), email: u?.email ?? null, phone: u?.phone ?? null, inue: u?.profile?.inue ?? null },
      advisor: t.advisorId ? { id: t.advisorId, name: nameOf(t.advisorId) } : null,
      createdAt: t.createdAt,
      lastMessageAt: t.lastMessageAt,
      lastMessageBy: t.lastMessageBy,
      closedAt: t.closedAt,
    };
  });
}

export interface ThreadFilters {
  status?: string; // OPEN | ANSWERED | CLOSED | "ACTIVE" (ouverts + répondus)
  search?: string;
  page?: number;
  limit?: number;
}

export async function threadStats(db: Db) {
  const counts = await db.select({ status: cultureThreads.status, n: sql<number>`count(*)::int` }).from(cultureThreads).groupBy(cultureThreads.status);
  const by = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>;
  return { open: by.OPEN ?? 0, answered: by.ANSWERED ?? 0, closed: by.CLOSED ?? 0 };
}

export async function listThreads(db: Db, filters: ThreadFilters) {
  const conditions: SQL[] = [];
  if (filters.status === "ACTIVE") conditions.push(inArray(cultureThreads.status, ["OPEN", "ANSWERED"]));
  else if (filters.status) conditions.push(eq(cultureThreads.status, filters.status));
  if (filters.search?.trim()) {
    const s = `%${filters.search.trim()}%`;
    const requesterIds = db
      .select({ id: identityUsers.id })
      .from(identityUsers)
      .leftJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(or(ilike(identityUsers.email, s), ilike(identityUserProfiles.firstName, s), ilike(identityUserProfiles.lastName, s)));
    conditions.push(or(ilike(cultureThreads.reference, s), ilike(cultureThreads.subject, s), inArray(cultureThreads.userId, requesterIds))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  // À traiter d'abord (OPEN), puis répondus, puis clos ; les plus récents en premier dans chaque groupe.
  const rank = sql`CASE ${cultureThreads.status} WHEN 'OPEN' THEN 0 WHEN 'ANSWERED' THEN 1 ELSE 2 END`;

  const [rows, [{ total }], stats] = await Promise.all([
    db.select().from(cultureThreads).where(where).orderBy(rank, desc(cultureThreads.lastMessageAt)).limit(limit).offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(cultureThreads).where(where),
    threadStats(db),
  ]);
  return { data: await enrichStaff(db, rows), total, page, limit, stats };
}

export async function getThreadForStaff(db: Db, id: string) {
  const thread = await getThreadRow(db, id);
  const [[enriched], messages] = await Promise.all([
    enrichStaff(db, [thread]),
    db.select().from(cultureMessages).where(eq(cultureMessages.threadId, id)).orderBy(cultureMessages.createdAt),
  ]);
  return {
    ...enriched,
    messages: messages.map((m) => ({ id: m.id, authorType: m.authorType, authorName: m.authorName, content: m.content, isInternal: m.isInternal, createdAt: m.createdAt })),
  };
}

/** Réponse du conseiller au membre (visible de lui, signée de son vrai nom) ou note interne. */
export async function addStaffMessage(db: Db, id: string, actorId: string, content: string, isInternal: boolean) {
  const thread = await getThreadRow(db, id);
  if (thread.status === "CLOSED" && !isInternal) throw new ConflictError("Cet échange est clos : rouvrez-le avant de répondre.");

  const actorName = await getActorName(db, actorId);
  await db.insert(cultureMessages).values({ id: newId("cmsg"), threadId: id, authorId: actorId, authorType: "ADVISOR", authorName: actorName, content, isInternal });
  if (isInternal) {
    await db.update(cultureThreads).set({ updatedAt: new Date() }).where(eq(cultureThreads.id, id));
    return getThreadForStaff(db, id);
  }

  const now = new Date();
  await db
    .update(cultureThreads)
    .set({ status: "ANSWERED", advisorId: thread.advisorId ?? actorId, lastMessageAt: now, lastMessageBy: "ADVISOR", updatedAt: now })
    .where(eq(cultureThreads.id, id));
  await createNotification(db, {
    userId: thread.userId,
    type: "CULTURE",
    title: `${actorName} vous a répondu`,
    body: `Réponse à « ${thread.subject} » :\n\n${excerpt(content)}`,
    payload: { cultureThreadId: id, reference: thread.reference },
    actionUrl: `/culture/echanges/${id}`,
    email: { subject: `Réponse du Conseiller Culturel (${thread.reference})`, actionLabel: "Voir la réponse" },
  });
  return getThreadForStaff(db, id);
}

export async function setThreadStatus(db: Db, id: string, actorId: string, status: "OPEN" | "CLOSED") {
  const thread = await getThreadRow(db, id);
  if (thread.status === status) return getThreadForStaff(db, id);
  const now = new Date();
  const actorName = await getActorName(db, actorId);
  await db
    .update(cultureThreads)
    .set({ status: status === "CLOSED" ? "CLOSED" : thread.lastMessageBy === "ADVISOR" ? "ANSWERED" : "OPEN", closedAt: status === "CLOSED" ? now : null, updatedAt: now })
    .where(eq(cultureThreads.id, id));
  await db.insert(cultureMessages).values({
    id: newId("cmsg"),
    threadId: id,
    authorId: actorId,
    authorType: "SYSTEM",
    authorName: null,
    content: status === "CLOSED" ? `Échange clos par ${actorName}.` : `Échange rouvert par ${actorName}.`,
    isInternal: false,
  });
  if (status === "CLOSED") {
    await createNotification(db, {
      userId: thread.userId,
      type: "CULTURE",
      title: `Échange ${thread.reference} clos`,
      body: `Votre échange « ${thread.subject} » avec le Conseiller Culturel est clos. Vous pouvez en ouvrir un nouveau à tout moment.`,
      payload: { cultureThreadId: id, reference: thread.reference },
      actionUrl: `/culture/echanges/${id}`,
    });
  }
  return getThreadForStaff(db, id);
}

/** Identité minimale d'un membre — pour les rendez-vous / demandes présentés dans l'espace du conseiller. */
export async function requesterSummary(db: Db, userId: string) {
  const u = await getUser(db, userId);
  return u ? { id: u.id, name: [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email, email: u.email, phone: u.phone ?? null, inue: u.profile?.inue ?? null } : null;
}
