import crypto from "crypto";
import { and, desc, eq, ilike, inArray, isNull, or, sql, SQL } from "drizzle-orm";
import { ConflictError, NotFoundError, ValidationError } from "@poramma/utils";
import type { Db } from "../db-type";
import { supportTickets, supportTicketMessages } from "../schema/support";
import { identityRoles, identityUserRoles, identityUsers, identityUserProfiles } from "../schema/identity";
import { getActorName, getUser, getUsersByIds } from "./identity";
import { createNotification } from "./notifications";

// ── Vocabulaire ──────────────────────────────────────────────────────────

export const TICKET_CATEGORIES = ["ACCOUNT", "DEMANDE", "RENDEZ_VOUS", "REGISTRATION", "TECHNICAL", "OTHER"] as const;
export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"] as const;
export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER"];

const CATEGORY_LABEL: Record<string, string> = {
  ACCOUNT: "Compte et connexion",
  DEMANDE: "Une demande",
  RENDEZ_VOUS: "Un rendez-vous",
  REGISTRATION: "Enregistrement / INUE",
  TECHNICAL: "Problème technique",
  OTHER: "Autre question",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours de traitement",
  WAITING_USER: "En attente de votre réponse",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
};

const PRIORITY_LABEL: Record<string, string> = { LOW: "Basse", NORMAL: "Normale", HIGH: "Haute", URGENT: "Urgente" };

/** Nom sous lequel l'ambassade signe ses réponses : jamais l'identité de l'agent. */
const EMBASSY_LABEL = "Ambassade du Mali";

type Ticket = typeof supportTickets.$inferSelect;
type TicketMessage = typeof supportTicketMessages.$inferSelect;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function newReference(db: Db): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const reference = `SUP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const [clash] = await db.select({ id: supportTickets.id }).from(supportTickets).where(eq(supportTickets.reference, reference));
    if (!clash) return reference;
  }
  throw new ConflictError("Impossible de générer un numéro de ticket, réessayez.");
}

const excerpt = (text: string, max = 220) => (text.length > max ? `${text.slice(0, max)}…` : text);

// ── Personnel ────────────────────────────────────────────────────────────

/** Utilisateurs ayant le rôle ADMIN (actif) — ceux qui traitent les tickets. */
export async function listAdminIds(db: Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: identityUserRoles.userId })
    .from(identityUserRoles)
    .innerJoin(identityRoles, eq(identityRoles.id, identityUserRoles.roleId))
    .where(and(eq(identityRoles.name, "ADMIN"), eq(identityUserRoles.isActive, true)));
  return rows.map((r) => r.userId);
}

/** Administrateurs assignables, avec leur nom. */
export async function listAssignees(db: Db) {
  const ids = await listAdminIds(db);
  const users = await getUsersByIds(db, ids);
  return ids
    .map((id) => {
      const p = users.get(id)?.profile;
      return { id, name: p ? [p.firstName, p.lastName].filter(Boolean).join(" ") || users.get(id)?.email || "Administrateur" : users.get(id)?.email ?? "Administrateur" };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Qui prévenir côté ambassade : l'administrateur assigné s'il y en a un, sinon tous. */
async function staffRecipients(db: Db, ticket: Ticket, exceptUserId?: string): Promise<string[]> {
  const ids = ticket.assignedTo ? [ticket.assignedTo] : await listAdminIds(db);
  return ids.filter((id) => id !== exceptUserId);
}

async function notifyStaff(db: Db, ticket: Ticket, params: { title: string; body: string; exceptUserId?: string; email?: boolean }) {
  for (const userId of await staffRecipients(db, ticket, params.exceptUserId)) {
    await createNotification(db, {
      userId,
      type: "ADMIN",
      title: params.title,
      body: params.body,
      payload: { supportTicketId: ticket.id, reference: ticket.reference },
      actionUrl: `/support-tickets/${ticket.id}`,
      // Pas de bouton dans l'email : le lien pointerait vers le portail citoyen, pas vers le backoffice.
      email: params.email === false ? undefined : { subject: `[Support ${ticket.reference}] ${params.title}` },
    });
  }
}

async function notifyRequester(db: Db, ticket: Ticket, params: { title: string; body: string; actionLabel: string }) {
  await createNotification(db, {
    userId: ticket.userId,
    type: "ADMIN",
    title: params.title,
    body: params.body,
    payload: { supportTicketId: ticket.id, reference: ticket.reference },
    actionUrl: `/support/tickets/${ticket.id}`,
    email: { subject: `${params.title} (${ticket.reference})`, actionLabel: params.actionLabel },
  });
}

/** Évènement de suivi dans le fil (changement de statut, assignation…). */
async function addEvent(db: Db, ticketId: string, content: string, internal: boolean, actor?: { id: string; name: string }) {
  await db.insert(supportTicketMessages).values({
    id: newId("tmsg"),
    ticketId,
    authorId: actor?.id ?? null,
    authorType: "SYSTEM",
    authorName: internal ? actor?.name ?? null : null,
    content,
    isInternal: internal,
  });
}

async function getTicketRow(db: Db, id: string): Promise<Ticket> {
  const [row] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
  if (!row) throw new NotFoundError("Ticket introuvable");
  return row;
}

// ── Vue de l'usager (jamais d'identité d'agent, jamais de note interne) ──

function publicTicket(t: Ticket) {
  return {
    id: t.id,
    reference: t.reference,
    subject: t.subject,
    category: t.category,
    linkedReference: t.linkedReference,
    status: t.status,
    createdAt: t.createdAt,
    lastMessageAt: t.lastMessageAt,
    lastMessageBy: t.lastMessageBy,
    resolvedAt: t.resolvedAt,
  };
}

function publicMessage(m: TicketMessage, requesterName: string) {
  return {
    id: m.id,
    authorType: m.authorType as "USER" | "STAFF" | "SYSTEM",
    authorName: m.authorType === "USER" ? requesterName : m.authorType === "STAFF" ? EMBASSY_LABEL : null,
    content: m.content,
    createdAt: m.createdAt,
  };
}

async function requesterName(db: Db, userId: string): Promise<string> {
  return getActorName(db, userId);
}

/** Ouvre un ticket : premier message de l'usager, accusé de réception, alerte des administrateurs. */
export async function createTicket(
  db: Db,
  userId: string,
  data: { category: string; subject: string; message: string; linkedReference?: string | null }
) {
  const reference = await newReference(db);
  const id = newId("tkt");
  const user = await getUser(db, userId);
  const name = user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : "";

  const [ticket] = await db
    .insert(supportTickets)
    .values({ id, reference, userId, category: data.category, subject: data.subject, linkedReference: data.linkedReference ?? null })
    .returning();
  await db.insert(supportTicketMessages).values({
    id: newId("tmsg"),
    ticketId: id,
    authorId: userId,
    authorType: "USER",
    authorName: name || null,
    content: data.message,
  });

  const contact = [user?.email, user?.phone, user?.profile?.inue ? `INUE ${user.profile.inue}` : null].filter(Boolean).join(" — ");
  await notifyStaff(db, ticket, {
    title: `Nouveau ticket ${reference} — ${data.subject}`,
    body: `${name || "Un usager"} (${contact}) — ${CATEGORY_LABEL[data.category] ?? data.category}${data.linkedReference ? ` — Réf. ${data.linkedReference}` : ""}\n\n${excerpt(data.message)}`,
  });
  await notifyRequester(db, ticket, {
    title: "Votre message a bien été transmis",
    body: `Nous avons reçu votre message « ${data.subject} ». Numéro de suivi : ${reference}. Vous serez prévenu(e) dès qu'un agent vous répond.`,
    actionLabel: "Suivre mon ticket",
  });
  return publicTicket(ticket);
}

export async function listTicketsForUser(db: Db, userId: string) {
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.lastMessageAt));
  return rows.map(publicTicket);
}

export async function getTicketForUser(db: Db, userId: string, id: string) {
  const ticket = await getTicketRow(db, id);
  if (ticket.userId !== userId) throw new NotFoundError("Ticket introuvable"); // ne révèle pas l'existence du ticket d'autrui
  const [messages, name] = await Promise.all([
    db
      .select()
      .from(supportTicketMessages)
      .where(and(eq(supportTicketMessages.ticketId, id), eq(supportTicketMessages.isInternal, false)))
      .orderBy(supportTicketMessages.createdAt),
    requesterName(db, userId),
  ]);
  return { ...publicTicket(ticket), messages: messages.map((m) => publicMessage(m, name)) };
}

export async function addUserMessage(db: Db, userId: string, id: string, content: string) {
  const ticket = await getTicketRow(db, id);
  if (ticket.userId !== userId) throw new NotFoundError("Ticket introuvable");
  if (ticket.status === "CLOSED") throw new ConflictError("Ce ticket est clôturé. Ouvrez un nouveau ticket si vous avez encore besoin d'aide.");

  const name = await requesterName(db, userId);
  const [message] = await db
    .insert(supportTicketMessages)
    .values({ id: newId("tmsg"), ticketId: id, authorId: userId, authorType: "USER", authorName: name, content })
    .returning();

  const reopened = ticket.status === "RESOLVED";
  const nextStatus = reopened ? "OPEN" : ticket.status === "WAITING_USER" ? "IN_PROGRESS" : ticket.status;
  const [updated] = await db
    .update(supportTickets)
    .set({ status: nextStatus, resolvedAt: reopened ? null : ticket.resolvedAt, lastMessageAt: new Date(), lastMessageBy: "USER", updatedAt: new Date() })
    .where(eq(supportTickets.id, id))
    .returning();
  if (reopened) await addEvent(db, id, "Ticket rouvert : l'usager a répondu.", false);

  await notifyStaff(db, updated, {
    title: `${reopened ? "Ticket rouvert" : "Nouvelle réponse"} — ${ticket.reference}`,
    body: `${name} : ${excerpt(content)}`,
  });
  return publicMessage(message, name);
}

/** L'usager estime son problème réglé : le ticket passe en « Résolu » (l'ambassade le clôt ensuite, ou l'usager peut le rouvrir en répondant). */
export async function resolveByUser(db: Db, userId: string, id: string) {
  const ticket = await getTicketRow(db, id);
  if (ticket.userId !== userId) throw new NotFoundError("Ticket introuvable");
  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") return publicTicket(ticket);

  const [updated] = await db.update(supportTickets).set({ status: "RESOLVED", resolvedAt: new Date(), updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
  await addEvent(db, id, "Marqué comme résolu par l'usager.", false);
  await notifyStaff(db, updated, { title: `Ticket résolu par l'usager — ${ticket.reference}`, body: `« ${ticket.subject} » a été marqué comme résolu.`, email: false });
  return publicTicket(updated);
}

// ── Vue de l'ambassade (administrateurs) ─────────────────────────────────

async function enrichStaff(db: Db, rows: Ticket[]) {
  const users = await getUsersByIds(db, rows.flatMap((t) => [t.userId, t.assignedTo].filter((x): x is string => !!x)));
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const u = users.get(id);
    if (!u) return null;
    return [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email;
  };
  return rows.map((t) => {
    const u = users.get(t.userId);
    return {
      id: t.id,
      reference: t.reference,
      subject: t.subject,
      category: t.category,
      linkedReference: t.linkedReference,
      status: t.status,
      priority: t.priority,
      requester: { id: t.userId, name: nameOf(t.userId), email: u?.email ?? null, phone: u?.phone ?? null, inue: u?.profile?.inue ?? null },
      assignee: t.assignedTo ? { id: t.assignedTo, name: nameOf(t.assignedTo) } : null,
      createdAt: t.createdAt,
      lastMessageAt: t.lastMessageAt,
      lastMessageBy: t.lastMessageBy,
      firstResponseAt: t.firstResponseAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
    };
  });
}

export interface TicketFilters {
  status?: string; // un statut, ou "ACTIVE" (ouverts + en cours + en attente de l'usager)
  category?: string;
  priority?: string;
  assigned?: string; // "me" | "unassigned" | id d'un administrateur
  search?: string;
  page?: number;
  limit?: number;
}

export async function listTickets(db: Db, actorId: string, filters: TicketFilters) {
  const conditions: SQL[] = [];
  if (filters.status === "ACTIVE") conditions.push(inArray(supportTickets.status, ACTIVE_STATUSES));
  else if (filters.status) conditions.push(eq(supportTickets.status, filters.status));
  if (filters.category) conditions.push(eq(supportTickets.category, filters.category));
  if (filters.priority) conditions.push(eq(supportTickets.priority, filters.priority));
  if (filters.assigned === "me") conditions.push(eq(supportTickets.assignedTo, actorId));
  else if (filters.assigned === "unassigned") conditions.push(isNull(supportTickets.assignedTo));
  else if (filters.assigned) conditions.push(eq(supportTickets.assignedTo, filters.assigned));
  if (filters.search?.trim()) {
    const s = `%${filters.search.trim()}%`;
    const requesterIds = db
      .select({ id: identityUsers.id })
      .from(identityUsers)
      .leftJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(or(ilike(identityUsers.email, s), ilike(identityUserProfiles.firstName, s), ilike(identityUserProfiles.lastName, s)));
    conditions.push(
      or(ilike(supportTickets.reference, s), ilike(supportTickets.subject, s), ilike(supportTickets.linkedReference, s), inArray(supportTickets.userId, requesterIds))!
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const finishedLast = sql`CASE WHEN ${supportTickets.status} IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END`;
  const priorityWeight = sql`CASE ${supportTickets.priority} WHEN 'URGENT' THEN 3 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 1 ELSE 0 END`;

  const [rows, [{ total }], statusCounts, [{ unassigned }], [{ mine }]] = await Promise.all([
    db
      .select()
      .from(supportTickets)
      .where(where)
      .orderBy(finishedLast, sql`${priorityWeight} DESC`, desc(supportTickets.lastMessageAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(supportTickets).where(where),
    db.select({ status: supportTickets.status, n: sql<number>`count(*)::int` }).from(supportTickets).groupBy(supportTickets.status),
    db
      .select({ unassigned: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(isNull(supportTickets.assignedTo), inArray(supportTickets.status, ACTIVE_STATUSES))),
    db
      .select({ mine: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(eq(supportTickets.assignedTo, actorId), inArray(supportTickets.status, ACTIVE_STATUSES))),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((c) => [c.status, c.n])) as Record<string, number>;
  return {
    data: await enrichStaff(db, rows),
    total,
    page,
    limit,
    stats: {
      open: byStatus.OPEN ?? 0,
      inProgress: byStatus.IN_PROGRESS ?? 0,
      waitingUser: byStatus.WAITING_USER ?? 0,
      resolved: byStatus.RESOLVED ?? 0,
      closed: byStatus.CLOSED ?? 0,
      unassigned,
      mine,
    },
  };
}

export async function getTicketForStaff(db: Db, id: string) {
  const ticket = await getTicketRow(db, id);
  const [[enriched], messages] = await Promise.all([
    enrichStaff(db, [ticket]),
    db.select().from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, id)).orderBy(supportTicketMessages.createdAt),
  ]);
  return {
    ...enriched,
    messages: messages.map((m) => ({
      id: m.id,
      authorType: m.authorType,
      authorName: m.authorName,
      content: m.content,
      isInternal: m.isInternal,
      createdAt: m.createdAt,
    })),
  };
}

/** Réponse à l'usager (visible de lui) ou note interne (réservée aux administrateurs). */
export async function addStaffMessage(db: Db, id: string, actorId: string, content: string, isInternal: boolean) {
  const ticket = await getTicketRow(db, id);
  if (ticket.status === "CLOSED" && !isInternal) throw new ConflictError("Ce ticket est clôturé : rouvrez-le avant de répondre à l'usager.");

  const actorName = await getActorName(db, actorId);
  await db.insert(supportTicketMessages).values({ id: newId("tmsg"), ticketId: id, authorId: actorId, authorType: "STAFF", authorName: actorName, content, isInternal });

  if (isInternal) {
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, id));
    return getTicketForStaff(db, id);
  }

  const now = new Date();
  const [updated] = await db
    .update(supportTickets)
    .set({
      status: "WAITING_USER",
      resolvedAt: null,
      firstResponseAt: ticket.firstResponseAt ?? now,
      assignedTo: ticket.assignedTo ?? actorId,
      lastMessageAt: now,
      lastMessageBy: "STAFF",
      updatedAt: now,
    })
    .where(eq(supportTickets.id, id))
    .returning();
  await notifyRequester(db, updated, {
    title: `Réponse à votre ticket ${ticket.reference}`,
    body: `L'ambassade a répondu à « ${ticket.subject} » :\n\n${excerpt(content)}`,
    actionLabel: "Voir la réponse",
  });
  return getTicketForStaff(db, id);
}

export async function updateTicket(
  db: Db,
  id: string,
  actorId: string,
  patch: { status?: string; priority?: string; assignedTo?: string | null }
) {
  const ticket = await getTicketRow(db, id);
  if (ticket.status === "CLOSED") throw new ConflictError("Ce ticket est clôturé : il ne peut plus être modifié.");
  if (patch.status && !(TICKET_STATUSES as readonly string[]).includes(patch.status)) throw new ValidationError("Statut invalide", { status: ["invalid"] });
  if (patch.priority && !(TICKET_PRIORITIES as readonly string[]).includes(patch.priority)) throw new ValidationError("Priorité invalide", { priority: ["invalid"] });

  const actorName = await getActorName(db, actorId);
  const actor = { id: actorId, name: actorName };
  const now = new Date();
  const set: Partial<typeof supportTickets.$inferInsert> = { updatedAt: now };
  const events: { text: string; internal: boolean }[] = [];
  let notifyStatus: string | null = null;

  // Assignation
  let nextAssignee: string | null | undefined = patch.assignedTo;
  if (patch.status === "IN_PROGRESS" && patch.assignedTo === undefined && !ticket.assignedTo) nextAssignee = actorId; // prise en charge
  if (nextAssignee !== undefined && nextAssignee !== ticket.assignedTo) {
    if (nextAssignee && !(await listAdminIds(db)).includes(nextAssignee)) throw new ValidationError("Cet utilisateur ne peut pas traiter les tickets", { assignedTo: ["not an admin"] });
    set.assignedTo = nextAssignee;
    events.push({ text: nextAssignee ? `Assigné à ${await getActorName(db, nextAssignee)}` : "Assignation retirée", internal: true });
  }

  // Priorité
  if (patch.priority && patch.priority !== ticket.priority) {
    set.priority = patch.priority;
    events.push({ text: `Priorité : ${PRIORITY_LABEL[patch.priority]}`, internal: true });
  }

  // Statut
  if (patch.status && patch.status !== ticket.status) {
    set.status = patch.status;
    if (patch.status === "RESOLVED") set.resolvedAt = now;
    else if (patch.status === "CLOSED") {
      set.closedAt = now;
      set.resolvedAt = ticket.resolvedAt ?? now;
    } else set.resolvedAt = null;
    events.push({ text: `Statut : ${STATUS_LABEL[patch.status]}`, internal: false });
    notifyStatus = patch.status;
  }

  if (Object.keys(set).length === 1) return getTicketForStaff(db, id); // rien à changer

  const [updated] = await db.update(supportTickets).set(set).where(eq(supportTickets.id, id)).returning();
  for (const e of events) await addEvent(db, id, e.text, e.internal, actor);

  if (set.assignedTo && set.assignedTo !== actorId) {
    await createNotification(db, {
      userId: set.assignedTo,
      type: "ADMIN",
      title: `Ticket assigné — ${ticket.reference}`,
      body: `${actorName} vous a assigné « ${ticket.subject} ».`,
      payload: { supportTicketId: id, reference: ticket.reference },
      actionUrl: `/support-tickets/${id}`,
    });
  }
  if (notifyStatus === "IN_PROGRESS") {
    await notifyRequester(db, updated, { title: `Votre ticket ${ticket.reference} est pris en charge`, body: `Un agent de l'ambassade traite « ${ticket.subject} ».`, actionLabel: "Suivre mon ticket" });
  } else if (notifyStatus === "RESOLVED") {
    await notifyRequester(db, updated, { title: `Ticket ${ticket.reference} résolu`, body: `Votre demande « ${ticket.subject} » a été marquée comme résolue. Si le problème persiste, répondez simplement dans le ticket.`, actionLabel: "Voir mon ticket" });
  } else if (notifyStatus === "CLOSED") {
    await notifyRequester(db, updated, { title: `Ticket ${ticket.reference} clôturé`, body: `Votre demande « ${ticket.subject} » est clôturée. Pour toute nouvelle question, ouvrez un nouveau ticket.`, actionLabel: "Voir mon ticket" });
  }
  return getTicketForStaff(db, id);
}
