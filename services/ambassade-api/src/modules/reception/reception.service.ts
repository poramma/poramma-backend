import crypto from "crypto";
import { and, eq, gte, ilike, inArray, isNull, like, lte, or, sql, SQL } from "drizzle-orm";
import { db } from "../../db/connection";
import { walkInRequests } from "../../db/schema.walkin";
import { rendezVous, agentServiceAssignments } from "../../db/schema.rendezvous";
import { demandes, demandeHistories } from "../../db/schema.demandes";
import { subServices } from "../../db/schema.ambassade";
import { etudiants } from "../../db/schema.etudiants";
import { identityUsers, identityUserProfiles, identityAgents } from "../../db/schema.identity-readonly";
import { ConflictError, NotFoundError, ValidationError } from "@poramma/utils";
import { demandesLogic, identityLogic, notificationsLogic, rendezvousLogic } from "@poramma/ambassade-core";
import { getAgent, getActorName } from "../../shared/enrich";
import { writeAudit } from "../audit/audit.service";
import * as rdvService from "../rendezvous/rendezvous.service";

interface Actor {
  userId: string;
  roleName: string | null;
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const today = () => rendezvousLogic.nowInEmbassyTz().date;

const fullName = (u: { profile?: { firstName?: string | null; lastName?: string | null } | null; email?: string | null } | null | undefined) =>
  [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.email || "—";

// ── Rendez-vous : validation des tickets à l'accueil ─────────────────────

const CANCELLED = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
const ARRIVED = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

type EnrichedRdv = Awaited<ReturnType<typeof rdvService.getRendezVous>>;

function ticketView(r: EnrichedRdv) {
  const agentName = [r.agent?.user?.profile?.firstName, r.agent?.user?.profile?.lastName].filter(Boolean).join(" ");
  return {
    id: r.id,
    ticketId: r.ticketId,
    date: r.date,
    startTime: r.slotId?.split("|")[4] ?? null,
    endTime: r.slot?.endTime ?? null,
    status: r.status,
    type: r.type,
    isUrgent: r.isUrgent,
    motif: r.motif,
    checkedInAt: r.checkedInAt,
    subServiceName: (r.subService as { name?: string } | null)?.name ?? "—",
    citizen: {
      id: r.userId,
      name: fullName(r.user),
      inue: r.user?.profile?.inue ?? null,
      phone: r.user?.phone ?? null,
      city: r.visitor?.city ?? null,
      /** true = personne reçue sans compte Poramma (identité saisie à l'accueil). */
      isVisitor: !r.userId,
    },
    agentName: agentName || null,
  };
}

// ── Notification des agents d'un service ─────────────────────────────────

/** Agents actuellement affectés à un sous-service (affectation active et valide aujourd'hui). */
async function assignedAgents(subServiceId: string): Promise<{ agentId: string; userId: string }[]> {
  const date = today();
  const rows = await db
    .select({ agentId: agentServiceAssignments.agentId, userId: identityAgents.userId })
    .from(agentServiceAssignments)
    .innerJoin(identityAgents, eq(identityAgents.id, agentServiceAssignments.agentId))
    .where(
      and(
        eq(agentServiceAssignments.subServiceId, subServiceId),
        eq(agentServiceAssignments.active, true),
        eq(identityAgents.active, true),
        or(isNull(agentServiceAssignments.validFrom), lte(agentServiceAssignments.validFrom, date)),
        or(isNull(agentServiceAssignments.validUntil), gte(agentServiceAssignments.validUntil, date))
      )
    );
  return rows;
}

/** Prévient (in-app) tous les agents d'un service — sans email : l'agent est au poste, l'alerte doit être immédiate. */
async function notifyServiceAgents(subServiceId: string, params: { title: string; body: string; payload?: Record<string, unknown> }, exceptUserId?: string) {
  try {
    for (const agent of await assignedAgents(subServiceId)) {
      if (agent.userId === exceptUserId) continue;
      await notificationsLogic.createNotification(db, {
        userId: agent.userId,
        type: "RDV",
        title: params.title,
        body: params.body,
        payload: params.payload ?? null,
        actionUrl: "/rendez-vous",
      });
    }
  } catch (err) {
    console.error("[reception] notification du service échouée", err);
  }
}

// ── Rendez-vous d'urgence à l'accueil ────────────────────────────────────

export interface CreateUrgenceInput {
  subServiceId: string;
  motif: string;
  urgenceJustification: string;
  /** Membre de la plateforme… */
  userId?: string | null;
  /** …ou personne sans compte : identité minimale. */
  visitor?: { lastName: string; firstName: string; phone: string; city: string } | null;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Rendez-vous d'urgence pris à l'accueil, sans créneau. La personne peut ne pas avoir de compte : on saisit alors
 * nom, prénom, téléphone et ville. L'agent le moins chargé du jour en est titulaire, et TOUS les agents du service sont prévenus.
 */
export async function createUrgence(data: CreateUrgenceInput, actor: Actor) {
  if (!data.userId === !data.visitor) {
    throw new ValidationError("Indiquez soit un membre de la plateforme, soit l'identité de la personne.", { userId: ["choose one"] });
  }
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, data.subServiceId));
  if (!sub || sub.active === false) throw new NotFoundError("Service introuvable");

  let displayName: string;
  let phone: string | null;
  if (data.userId) {
    const member = await identityLogic.getUser(db, data.userId);
    if (!member) throw new ValidationError("Membre introuvable", { userId: ["unknown user"] });
    displayName = fullName(member);
    phone = member.phone ?? null;
  } else {
    displayName = `${data.visitor!.firstName} ${data.visitor!.lastName}`.trim();
    phone = data.visitor!.phone;
  }

  const agents = await assignedAgents(data.subServiceId);
  if (!agents.length) {
    throw new ValidationError("Aucun agent n'est affecté à ce service : impossible de prendre le rendez-vous d'urgence. Choisissez un autre service ou prévenez l'administrateur.", {
      subServiceId: ["no agent assigned"],
    });
  }
  // Répartition équitable : l'agent qui a le moins de rendez-vous aujourd'hui.
  const date = today();
  const loads = await db
    .select({ agentId: rendezVous.agentId, n: sql<number>`count(*)::int` })
    .from(rendezVous)
    .where(and(eq(rendezVous.date, date), inArray(rendezVous.agentId, agents.map((a) => a.agentId))))
    .groupBy(rendezVous.agentId);
  const load = (id: string) => loads.find((l) => l.agentId === id)?.n ?? 0;
  const chosen = [...agents].sort((a, b) => load(a.agentId) - load(b.agentId) || a.agentId.localeCompare(b.agentId))[0];

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const ticketId = await rendezvousLogic.nextTicketId(db, date, "URG");
      const [row] = await db
        .insert(rendezVous)
        .values({
          id: newId("rdv"),
          userId: data.userId ?? null,
          visitor: data.visitor ?? null,
          subServiceId: data.subServiceId,
          agentId: chosen.agentId,
          slotId: null,
          date,
          ticketId,
          type: "URGENCE",
          status: "CONFIRMED",
          motif: data.motif.trim(),
          isUrgent: true,
          urgenceJustification: data.urgenceJustification.trim(),
          createdBy: actor.userId,
        })
        .returning();

      await writeAudit({
        action: "CREATE",
        entityType: "RENDEZ_VOUS",
        entityId: row.id,
        actor,
        entitySnapshot: { type: "URGENCE", subServiceId: data.subServiceId, withoutAccount: !data.userId },
        details: { ticketId, atReception: true },
      });

      await notifyServiceAgents(data.subServiceId, {
        title: `Rendez-vous URGENT — ${sub.name}`,
        body: `${displayName}${phone ? ` (${phone})` : ""} se présente à l'accueil. Motif : ${data.motif.trim()}. Urgence : ${data.urgenceJustification.trim()} (ticket ${ticketId}).`,
        payload: { rendezVousId: row.id, event: "URGENCE" },
      });
      return ticketView(await rdvService.getRendezVous(row.id));
    } catch (err) {
      if (isUniqueViolation(err)) continue; // deux urgences simultanées : le numéro de ticket est repris
      throw err;
    }
  }
  throw new ConflictError("Impossible d'attribuer un numéro de ticket, réessayez.");
}

/** Rendez-vous d'une journée (par défaut aujourd'hui), tous services confondus — l'accueil voit toute l'ambassade. */
export async function listAppointments(params: { date?: string; q?: string }) {
  const date = params.date ?? today();
  const rows = (await rdvService.listRendezVous({ date })).filter((r) => !CANCELLED.includes(r.status));
  const views = rows.map(ticketView);
  const q = params.q?.trim().toLowerCase();
  const filtered = q
    ? views.filter((v) => [v.ticketId, v.citizen.name, v.citizen.inue, v.citizen.phone, v.subServiceName].some((x) => x?.toLowerCase().includes(q)))
    : views;
  return filtered.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.ticketId.localeCompare(b.ticketId));
}

/** Retrouve un ticket par son numéro (« RDV-20260920-001 ») — saisi ou lu sur le ticket du citoyen. */
export async function lookupTicket(ticket: string) {
  const wanted = ticket.trim().toUpperCase();
  const [row] = await db.select({ id: rendezVous.id }).from(rendezVous).where(eq(rendezVous.ticketId, wanted));
  if (!row) throw new NotFoundError("Aucun rendez-vous ne correspond à ce ticket.");
  return ticketView(await rdvService.getRendezVous(row.id));
}

/**
 * Valide l'arrivée d'un usager : le ticket doit être celui d'aujourd'hui et encore actif.
 * Un rendez-vous encore « en attente » est confirmé du même coup (la présence vaut confirmation).
 */
export async function validateArrival(id: string, actor: Actor) {
  const rdv = await rdvService.getRendezVous(id);

  if (CANCELLED.includes(rdv.status)) throw new ConflictError("Ce rendez-vous est annulé : le ticket n'est plus valable.");
  if (ARRIVED.includes(rdv.status)) throw new ConflictError("Ce ticket a déjà été validé.");
  const now = today();
  if (rdv.date > now) throw new ConflictError(`Ce rendez-vous est prévu le ${rdv.date} : il ne peut pas être validé aujourd'hui.`);
  if (rdv.date < now) throw new ConflictError(`Ce ticket est périmé (rendez-vous du ${rdv.date}).`);

  const updated = await rdvService.checkIn(id);
  await writeAudit({
    action: "CHECK_IN",
    entityType: "RENDEZ_VOUS",
    entityId: id,
    actor,
    entitySnapshot: { fromStatus: rdv.status, toStatus: "CHECKED_IN" },
    details: { ticketId: rdv.ticketId, atReception: true },
  });

  // L'agent concerné sait que l'usager est arrivé (notification interne, sans email).
  try {
    const agent = await getAgent(rdv.agentId);
    if (agent?.userId) {
      await notificationsLogic.createNotification(db, {
        userId: agent.userId,
        type: "RDV",
        title: `Usager arrivé — ${rdv.ticketId}`,
        body: `${fullName(rdv.user)} est à l'accueil pour son rendez-vous de ${rdv.slotId?.split("|")[4] ?? "ce jour"} (${(rdv.subService as { name?: string } | null)?.name ?? "service"}).`,
        payload: { rendezVousId: id, event: "ARRIVED" },
        actionUrl: "/rendez-vous",
      });
    }
  } catch (err) {
    console.error("[reception] notification de l'agent échouée", err);
  }
  return ticketView(updated);
}

// ── Registre des demandes sur place ──────────────────────────────────────

export const WALKIN_CATEGORIES = ["INFORMATION", "DEPOT", "RETRAIT", "SUIVI", "AUTRE"] as const;
export const WALKIN_STATUSES = ["WAITING", "IN_SERVICE", "DONE", "REDIRECTED", "ABANDONED"] as const;
const FINAL = ["DONE", "REDIRECTED", "ABANDONED"];

type WalkIn = typeof walkInRequests.$inferSelect;

async function enrichWalkIns(rows: WalkIn[]) {
  if (!rows.length) return [];
  const subIds = [...new Set(rows.flatMap((r) => [r.subServiceId, r.redirectedSubServiceId]).filter((x): x is string => !!x))];
  const demandeIds = rows.map((r) => r.demandeId).filter((x): x is string => !!x);
  const userIds = [...rows.flatMap((r) => [r.userId, r.registeredBy, r.assignedAgentId]).filter((x): x is string => !!x)];
  const [subs, dems, users] = await Promise.all([
    subIds.length ? db.select({ id: subServices.id, name: subServices.name }).from(subServices).where(inArray(subServices.id, subIds)) : Promise.resolve([]),
    demandeIds.length ? db.select({ id: demandes.id, dossierNumber: demandes.dossierNumber }).from(demandes).where(inArray(demandes.id, demandeIds)) : Promise.resolve([]),
    identityLogic.getUsersByIds(db, userIds),
  ]);
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    visitorName: r.visitorName,
    visitorPhone: r.visitorPhone,
    member: r.userId ? { id: r.userId, name: fullName(users.get(r.userId)), inue: users.get(r.userId)?.profile?.inue ?? null } : null,
    subService: r.subServiceId ? { id: r.subServiceId, name: subs.find((s) => s.id === r.subServiceId)?.name ?? "—" } : null,
    category: r.category,
    subject: r.subject,
    notes: r.notes,
    status: r.status,
    priority: r.priority,
    outcome: r.outcome,
    redirectedTo: r.redirectedSubServiceId ? { id: r.redirectedSubServiceId, name: subs.find((s) => s.id === r.redirectedSubServiceId)?.name ?? "—" } : null,
    demande: r.demandeId ? { id: r.demandeId, dossierNumber: dems.find((d) => d.id === r.demandeId)?.dossierNumber ?? null } : null,
    registeredByName: fullName(users.get(r.registeredBy)),
    createdAt: r.createdAt,
    startedAt: r.startedAt,
    closedAt: r.closedAt,
  }));
}

export async function listWalkIns(params: { date?: string; status?: string; q?: string }) {
  const conditions: SQL[] = [];
  if (params.date) {
    // Journée locale de l'ambassade (Rabat) : les créneaux et le registre sont exprimés dans ce fuseau.
    conditions.push(sql`(${walkInRequests.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${rendezvousLogic.TZ})::date = ${params.date}::date`);
  }
  if (params.status === "ACTIVE") conditions.push(inArray(walkInRequests.status, ["WAITING", "IN_SERVICE"]));
  else if (params.status) conditions.push(eq(walkInRequests.status, params.status));
  if (params.q?.trim()) {
    const s = `%${params.q.trim()}%`;
    conditions.push(or(ilike(walkInRequests.reference, s), ilike(walkInRequests.visitorName, s), ilike(walkInRequests.subject, s), ilike(walkInRequests.visitorPhone, s))!);
  }
  const rows = await db
    .select()
    .from(walkInRequests)
    .where(conditions.length ? and(...conditions) : undefined)
    // Urgents d'abord, puis premier arrivé, premier servi ; les dossiers clos en dernier.
    .orderBy(
      sql`CASE WHEN ${walkInRequests.status} IN ('DONE','REDIRECTED','ABANDONED') THEN 1 ELSE 0 END`,
      sql`CASE ${walkInRequests.priority} WHEN 'URGENT' THEN 0 ELSE 1 END`,
      walkInRequests.createdAt
    )
    .limit(300);
  return enrichWalkIns(rows);
}

async function nextReference(): Promise<string> {
  const compact = today().replace(/-/g, "");
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(walkInRequests).where(like(walkInRequests.reference, `ACC-${compact}-%`));
  return `ACC-${compact}-${String(count + 1).padStart(3, "0")}`;
}

export interface CreateWalkInInput {
  visitorName?: string;
  visitorPhone?: string | null;
  userId?: string | null;
  subServiceId?: string | null;
  category: (typeof WALKIN_CATEGORIES)[number];
  subject: string;
  notes?: string | null;
  priority?: "NORMAL" | "URGENT";
}

export async function createWalkIn(data: CreateWalkInInput, actor: Actor) {
  let visitorName = data.visitorName?.trim() ?? "";
  let phone = data.visitorPhone?.trim() || null;

  if (data.userId) {
    const member = await identityLogic.getUser(db, data.userId);
    if (!member) throw new ValidationError("Membre introuvable", { userId: ["unknown user"] });
    visitorName = visitorName || fullName(member);
    phone = phone ?? member.phone ?? null;
  }
  if (!visitorName) throw new ValidationError("Indiquez le nom du visiteur", { visitorName: ["required"] });

  if (data.subServiceId) {
    const [sub] = await db.select({ id: subServices.id }).from(subServices).where(eq(subServices.id, data.subServiceId));
    if (!sub) throw new ValidationError("Service introuvable", { subServiceId: ["unknown sub-service"] });
  }

  // Le numéro d'ordre est calculé sur le décompte du jour : deux saisies simultanées peuvent entrer en collision (index unique) → on réessaie.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(walkInRequests)
        .values({
          id: newId("walk"),
          reference: await nextReference(),
          visitorName,
          visitorPhone: phone,
          userId: data.userId ?? null,
          subServiceId: data.subServiceId ?? null,
          category: data.category,
          subject: data.subject.trim(),
          notes: data.notes?.trim() || null,
          priority: data.priority ?? "NORMAL",
          registeredBy: actor.userId,
        })
        .returning();
      await writeAudit({
        action: "CREATE",
        entityType: "DEMANDE_SUR_PLACE",
        entityId: row.id,
        actor,
        entitySnapshot: { reference: row.reference, category: row.category, subServiceId: row.subServiceId },
        details: { reference: row.reference },
      });
      return (await enrichWalkIns([row]))[0];
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      if (e?.code === "23505" || e?.cause?.code === "23505") continue;
      throw err;
    }
  }
  throw new ConflictError("Impossible d'attribuer un numéro d'ordre, réessayez.");
}

async function getWalkInRow(id: string): Promise<WalkIn> {
  const [row] = await db.select().from(walkInRequests).where(eq(walkInRequests.id, id));
  if (!row) throw new NotFoundError("Demande sur place introuvable");
  return row;
}

export interface UpdateWalkInInput {
  status?: (typeof WALKIN_STATUSES)[number];
  priority?: "NORMAL" | "URGENT";
  notes?: string | null;
  outcome?: string | null;
  subServiceId?: string | null;
  /** Obligatoire quand le statut passe à REDIRECTED : le service vers lequel le visiteur est orienté. */
  redirectedSubServiceId?: string | null;
}

export async function updateWalkIn(id: string, patch: UpdateWalkInInput, actor: Actor) {
  const row = await getWalkInRow(id);
  if (FINAL.includes(row.status)) throw new ConflictError("Cette demande est clôturée : elle ne peut plus être modifiée.");

  const now = new Date();
  const set: Partial<typeof walkInRequests.$inferInsert> = { updatedAt: now };
  if (patch.priority) set.priority = patch.priority;
  if (patch.notes !== undefined) set.notes = patch.notes?.trim() || null;
  if (patch.outcome !== undefined) set.outcome = patch.outcome?.trim() || null;
  if (patch.subServiceId !== undefined) {
    if (patch.subServiceId) {
      const [sub] = await db.select({ id: subServices.id }).from(subServices).where(eq(subServices.id, patch.subServiceId));
      if (!sub) throw new ValidationError("Service introuvable", { subServiceId: ["unknown sub-service"] });
    }
    set.subServiceId = patch.subServiceId;
  }
  let redirectTarget: { id: string; name: string } | null = null;
  if (patch.status === "REDIRECTED" && row.status !== "REDIRECTED") {
    if (!patch.redirectedSubServiceId) throw new ValidationError("Précisez le service vers lequel le visiteur est orienté.", { redirectedSubServiceId: ["required"] });
    const [target] = await db.select({ id: subServices.id, name: subServices.name }).from(subServices).where(eq(subServices.id, patch.redirectedSubServiceId));
    if (!target) throw new ValidationError("Service d'orientation introuvable", { redirectedSubServiceId: ["unknown sub-service"] });
    redirectTarget = target;
    set.redirectedSubServiceId = target.id;
    // Pas de saisie libre obligatoire : le résultat est déduit du service choisi (une précision peut s'y ajouter).
    set.outcome = [`Orienté vers ${target.name}`, patch.outcome?.trim()].filter(Boolean).join(" — ");
  }
  if (patch.status && patch.status !== row.status) {
    if (patch.status === "WAITING") throw new ValidationError("Une demande en cours de traitement ne repasse pas en attente.", { status: ["invalid transition"] });
    set.status = patch.status;
    if (patch.status === "IN_SERVICE") set.startedAt = now;
    if (FINAL.includes(patch.status)) {
      set.closedAt = now;
      set.startedAt = row.startedAt ?? now;
    }
  }

  const [updated] = await db.update(walkInRequests).set(set).where(eq(walkInRequests.id, id)).returning();
  if (patch.status && patch.status !== row.status) {
    await writeAudit({
      action: "UPDATE_STATUS",
      entityType: "DEMANDE_SUR_PLACE",
      entityId: id,
      actor,
      entitySnapshot: { fromStatus: row.status, toStatus: patch.status },
      details: { reference: row.reference, ...(redirectTarget ? { redirectedTo: redirectTarget.name } : {}) },
    });
  }
  // Les agents du service d'orientation sont prévenus : le visiteur arrive chez eux.
  if (redirectTarget) {
    await notifyServiceAgents(redirectTarget.id, {
      title: `Visiteur orienté vers ${redirectTarget.name}`,
      body: `${row.visitorName}${row.visitorPhone ? ` (${row.visitorPhone})` : ""} vous est orienté(e) depuis l'accueil (${row.reference}) : ${row.subject}`,
      payload: { walkInId: id, event: "REDIRECTED" },
    });
  }
  return (await enrichWalkIns([updated]))[0];
}

/**
 * Transforme la demande sur place en dossier officiel (pour un membre de la plateforme) : le dossier
 * apparaît dans son espace comme s'il l'avait déposé lui-même, avec la mention de l'accueil.
 */
export async function createDossierFromWalkIn(id: string, actor: Actor) {
  const row = await getWalkInRow(id);
  if (row.demandeId) throw new ConflictError("Un dossier a déjà été créé pour cette demande.");
  if (!row.userId) throw new ValidationError("Rattachez d'abord un compte membre à cette demande pour créer un dossier.", { userId: ["required"] });
  if (!row.subServiceId) throw new ValidationError("Choisissez le service concerné pour créer un dossier.", { subServiceId: ["required"] });

  const demande = await demandesLogic.createDemande(db, {
    userId: row.userId,
    subServiceId: row.subServiceId,
    customPayload: { source: "ACCUEIL", accueilReference: row.reference, objet: row.subject },
  });
  await db.insert(demandeHistories).values({
    id: newId("hist"),
    demandeId: demande.id,
    action: "STATUS_CHANGE",
    fromStatus: "SUBMITTED",
    toStatus: "SUBMITTED",
    actorUserId: actor.userId,
    actorRole: actor.roleName,
    actorName: await getActorName(actor.userId),
    comment: `Demande déposée sur place, à l'accueil de l'ambassade (${row.reference}).`,
    isVisibleToUser: true,
  });
  await db.update(walkInRequests).set({ demandeId: demande.id, updatedAt: new Date() }).where(eq(walkInRequests.id, id));
  await writeAudit({
    action: "CREATE",
    entityType: "DEMANDE",
    entityId: demande.id,
    actor,
    details: { dossierNumber: demande.dossierNumber, fromWalkIn: row.reference },
  });
  return (await enrichWalkIns([await getWalkInRow(id)]))[0];
}

/** Compteurs du jour pour le poste d'accueil. */
export async function summary() {
  const date = today();
  const [rdvs, walkIns] = await Promise.all([
    db
      .select({ status: rendezVous.status, n: sql<number>`count(*)::int` })
      .from(rendezVous)
      .where(eq(rendezVous.date, date))
      .groupBy(rendezVous.status),
    db
      .select({ status: walkInRequests.status, n: sql<number>`count(*)::int` })
      .from(walkInRequests)
      .where(sql`(${walkInRequests.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${rendezvousLogic.TZ})::date = ${date}::date`)
      .groupBy(walkInRequests.status),
  ]);
  const count = (rows: { status: string; n: number }[], statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    date,
    rendezVous: {
      expected: count(rdvs, ["PENDING", "CONFIRMED"]),
      arrived: count(rdvs, ARRIVED),
      total: count(rdvs, ["PENDING", "CONFIRMED", ...ARRIVED]),
    },
    walkIns: {
      waiting: count(walkIns, ["WAITING"]),
      inService: count(walkIns, ["IN_SERVICE"]),
      closed: count(walkIns, FINAL),
      total: walkIns.reduce((s, r) => s + r.n, 0),
    },
  };
}

// ── Recherche d'un membre à rattacher ────────────────────────────────────

/** Recherche un compte membre (nom, e-mail, téléphone, INUE) — jamais un compte du personnel. */
export async function searchMembers(query: string) {
  const s = `%${query.trim()}%`;
  const rows = await db
    .select({
      id: identityUsers.id,
      email: identityUsers.email,
      phone: identityUsers.phone,
      firstName: identityUserProfiles.firstName,
      lastName: identityUserProfiles.lastName,
      inue: etudiants.inue,
      profileInue: identityUserProfiles.inue,
    })
    .from(identityUsers)
    .leftJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
    .leftJoin(etudiants, eq(etudiants.userId, identityUsers.id))
    .where(
      and(
        sql`not exists (select 1 from identity.agents a where a.user_id = ${identityUsers.id})`,
        or(
          ilike(identityUsers.email, s),
          ilike(identityUsers.phone, s),
          ilike(identityUserProfiles.firstName, s),
          ilike(identityUserProfiles.lastName, s),
          ilike(sql`concat(${identityUserProfiles.firstName}, ' ', ${identityUserProfiles.lastName})`, s),
          ilike(etudiants.inue, s)
        )
      )
    )
    .limit(8);
  return rows.map((r) => ({
    id: r.id,
    name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
    email: r.email,
    phone: r.phone,
    inue: r.inue ?? r.profileInue ?? null,
  }));
}
