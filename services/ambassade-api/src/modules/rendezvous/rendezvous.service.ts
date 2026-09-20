import crypto from "crypto";
import { db } from "../../db/connection";
import { rendezVous, dailySchedulePrints, rendezVousNotes } from "../../db/schema.rendezvous";
import { agentServiceAssignments, agentAvailabilities, agentExceptions } from "../../db/schema.rendezvous";
import { subServices, serviceSchedules, serviceExceptions } from "../../db/schema.ambassade";
import { demandes } from "../../db/schema.demandes";
import { eq, and, inArray, ne, like, sql, gte, lte } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { getUser, getAgent, getAgentByUserId, getSubServiceShallow, getActorName } from "../../shared/enrich";
import { writeAudit } from "../audit/audit.service";
import { rendezvousLogic, notificationsLogic } from "@poramma/ambassade-core";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

const CANCELLED_STATUSES = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];

/** Lundi=1 .. Dimanche=7 (JS Date.getDay() est Dimanche=0). */
function isoDayOfWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

export interface AgendaSlotDto {
  id: string;
  subServiceId: string;
  subService: unknown;
  agentId: string;
  agent: unknown;
  date: string;
  startTime: string;
  endTime: string;
  tz: string;
  isBooked: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  createdAt: string;
}

/**
 * Créneaux d'un sous-service pour une date. La règle de disponibilité (horaires
 * du service ∩ agents affectés disponibles, hors fermetures/absences) vit dans
 * @poramma/ambassade-core — partagée avec communaute-api ; ici on ne fait
 * qu'enrichir avec l'agent et le sous-service pour la vue staff.
 */
async function generateSlotsForSubService(subServiceId: string, date: string, filterAgentId?: string): Promise<AgendaSlotDto[]> {
  const raw = await rendezvousLogic.computeSlots(db, subServiceId, date, filterAgentId);
  if (!raw.length) return [];

  const subService = await getSubServiceShallow(subServiceId);
  const agents = new Map<string, unknown>();
  for (const agentId of new Set(raw.map((r) => r.agentId))) agents.set(agentId, await getAgent(agentId));

  return raw.map((r) => ({
    id: r.id,
    subServiceId,
    subService,
    agentId: r.agentId,
    agent: agents.get(r.agentId),
    date,
    startTime: r.startTime,
    endTime: r.endTime,
    tz: "Africa/Casablanca",
    isBooked: false,
    isBlocked: false,
    blockReason: null,
    createdAt: new Date().toISOString(),
  }));
}

/** GET /agenda-slots?date=&subServiceId=&agentId= */
export async function listAgendaSlots(query: { date: string; subServiceId?: string; agentId?: string }): Promise<AgendaSlotDto[]> {
  let targetSubServiceIds: string[];
  if (query.subServiceId) {
    targetSubServiceIds = [query.subServiceId];
  } else {
    const rows = await db.select({ id: subServices.id }).from(subServices).where(eq(subServices.active, true));
    targetSubServiceIds = rows.map((r) => r.id);
  }

  const allSlots: AgendaSlotDto[] = [];
  for (const subServiceId of targetSubServiceIds) {
    allSlots.push(...(await generateSlotsForSubService(subServiceId, query.date, query.agentId)));
  }

  if (!allSlots.length) return allSlots;

  const bookedSlotIds = new Set(
    (
      await db
        .select({ slotId: rendezVous.slotId })
        .from(rendezVous)
        .where(
          and(
            inArray(
              rendezVous.slotId,
              allSlots.map((s) => s.id)
            ),
            notCancelled()
          )
        )
    ).map((r) => r.slotId)
  );

  return allSlots.map((s) => ({ ...s, isBooked: bookedSlotIds.has(s.id) }));
}

function notCancelled() {
  return and(ne(rendezVous.status, "CANCELLED_BY_USER"), ne(rendezVous.status, "CANCELLED_BY_AGENT"), ne(rendezVous.status, "NO_SHOW"));
}

/** GET /agenda-slots/:slotId */
export async function getAgendaSlot(id: string): Promise<AgendaSlotDto> {
  const parts = id.split("|");
  if (parts.length !== 5 || parts[0] !== "slot") throw new NotFoundError("Créneau introuvable");
  const [, subServiceId, agentId, date, startTime] = parts;

  const slots = await generateSlotsForSubService(subServiceId, date, agentId);
  const match = slots.find((s) => s.startTime === startTime);
  if (!match) throw new NotFoundError("Créneau introuvable");

  const [booking] = await db.select().from(rendezVous).where(and(eq(rendezVous.slotId, id), notCancelled()));
  return { ...match, isBooked: !!booking };
}

/**
 * Reconstruit un AgendaSlot minimal à partir du slotId stocké sur la
 * demande — sans dépendre de l'assignation/disponibilité de l'agent étant
 * toujours valide aujourd'hui (contrairement à `generateSlotsForSubService`,
 * qui recalcule tout depuis la config actuelle et peut ne plus retrouver un
 * créneau réservé dans le passé si la config a changé depuis).
 */
async function reconstructSlot(row: typeof rendezVous.$inferSelect): Promise<AgendaSlotDto | null> {
  if (!row.slotId) return null;
  const parts = row.slotId.split("|");
  if (parts.length !== 5) return null;
  const startTime = parts[4];

  const dayOfWeek = isoDayOfWeek(row.date);
  const [schedule] = await db
    .select()
    .from(serviceSchedules)
    .where(and(eq(serviceSchedules.subServiceId, row.subServiceId), eq(serviceSchedules.dayOfWeek, dayOfWeek)));
  const endTime = schedule ? minutesToTime(timeToMinutes(startTime) + schedule.slotDurationMinutes) : startTime;

  return {
    id: row.slotId,
    subServiceId: row.subServiceId,
    subService: null,
    agentId: row.agentId,
    agent: null,
    date: row.date,
    startTime,
    endTime,
    tz: "Africa/Casablanca",
    isBooked: true,
    isBlocked: false,
    blockReason: null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Personne SANS compte reçue à l'accueil : on fabrique un « utilisateur » minimal à partir de son identité
 * saisie, pour que toutes les vues (agenda, impression, fiche) l'affichent comme n'importe quel usager.
 */
function visitorAsUser(visitor: NonNullable<(typeof rendezVous.$inferSelect)["visitor"]>) {
  return {
    id: null,
    email: null,
    phone: visitor.phone,
    status: null,
    createdAt: null,
    isVisitor: true,
    profile: { firstName: visitor.firstName, lastName: visitor.lastName, city: visitor.city, inue: null },
  };
}

async function enrichRendezVous(row: typeof rendezVous.$inferSelect) {
  const [user, subService, agent, demande, slot] = await Promise.all([
    row.userId ? getUser(row.userId) : Promise.resolve(row.visitor ? visitorAsUser(row.visitor) : null),
    getSubServiceShallow(row.subServiceId),
    getAgent(row.agentId),
    row.demandeId ? db.select().from(demandes).where(eq(demandes.id, row.demandeId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    reconstructSlot(row),
  ]);
  return { ...row, user, subService, agent, demande, slot };
}

/** GET /rendez-vous — filtres date/agentId/subServiceId/status/type/userId/fromDate/toDate. */
export async function listRendezVous(query: {
  date?: string;
  agentId?: string;
  subServiceId?: string;
  /** Restriction serveur (agent non-ADMIN scopé à ses services assignés) — voir rendezvous.controller.ts. */
  subServiceIds?: string[];
  status?: string;
  type?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const conditions = [];
  if (query.agentId) conditions.push(eq(rendezVous.agentId, query.agentId));
  if (query.subServiceId) conditions.push(eq(rendezVous.subServiceId, query.subServiceId));
  else if (query.subServiceIds) conditions.push(inArray(rendezVous.subServiceId, query.subServiceIds));
  if (query.status) conditions.push(eq(rendezVous.status, query.status));
  if (query.type) conditions.push(eq(rendezVous.type, query.type));
  if (query.userId) conditions.push(eq(rendezVous.userId, query.userId));
  if (query.date) conditions.push(eq(rendezVous.date, query.date));
  if (query.fromDate) conditions.push(gte(rendezVous.date, query.fromDate));
  if (query.toDate) conditions.push(lte(rendezVous.date, query.toDate));

  const rows = await db
    .select()
    .from(rendezVous)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(rendezVous.date, rendezVous.createdAt);

  return Promise.all(rows.map(enrichRendezVous));
}

export async function getRendezVous(id: string) {
  const [row] = await db.select().from(rendezVous).where(eq(rendezVous.id, id));
  if (!row) throw new NotFoundError("Rendez-vous introuvable");
  return enrichRendezVous(row);
}

async function nextTicketId(date: string, prefix: "RDV" | "URG"): Promise<string> {
  const compact = date.replace(/-/g, "");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rendezVous)
    .where(like(rendezVous.ticketId, `${prefix}-${compact}-%`));
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${compact}-${seq}`;
}

/** POST /rendez-vous */
export async function createRendezVous(
  data: { userId: string; subServiceId: string; agentId?: string; slotId: string; motif?: string | null; demandeId?: string | null },
  actor: Actor
) {
  const [existingBooking] = await db.select().from(rendezVous).where(and(eq(rendezVous.slotId, data.slotId), notCancelled()));
  if (existingBooking) throw new ValidationError("Ce créneau n'est plus disponible", { slotId: ["already booked"] });

  const slotParts = data.slotId.split("|");
  const rdvDate = slotParts.length === 5 ? slotParts[3] : new Date().toISOString().slice(0, 10);
  // Le RDV se prend pour un SERVICE, pas un agent précis (le demandeur ne
  // choisit jamais l'agent) : la source de vérité de l'agent qui traitera le
  // créneau est le slotId lui-même (format "slot|subServiceId|agentId|date|
  // startTime", voir slotId() plus haut), jamais une valeur libre envoyée
  // par le client.
  const agentId = slotParts.length === 5 ? slotParts[2] : data.agentId;
  if (!agentId) throw new ValidationError("Créneau invalide", { slotId: ["cannot resolve agent"] });
  const ticketId = await nextTicketId(rdvDate, "RDV");

  let row: typeof rendezVous.$inferSelect;
  try {
    [row] = await db
      .insert(rendezVous)
      .values({
        id: newId("rdv"),
        demandeId: data.demandeId ?? null,
        userId: data.userId,
        subServiceId: data.subServiceId,
        agentId,
        slotId: data.slotId,
        date: rdvDate,
        ticketId,
        type: "STANDARD",
        status: "PENDING",
        motif: data.motif ?? null,
        createdBy: actor.userId,
      })
      .returning();
  } catch (err) {
    // Index unique partiel sur slot_id : deux réservations simultanées du même créneau.
    if (rendezvousLogic.isSlotConflict(err)) throw new ValidationError("Ce créneau n'est plus disponible", { slotId: ["already booked"] });
    throw err;
  }

  await writeAudit({
    action: "CREATE",
    entityType: "RENDEZ_VOUS",
    entityId: row.id,
    actor,
    entitySnapshot: { type: "STANDARD", subServiceId: data.subServiceId },
    details: { ticketId },
  });

  return enrichRendezVous(row);
}

/** POST /rendez-vous/urgence — perm rdv:create-urgence, pas de slot planifié. */
export async function createUrgence(
  data: { userId: string; subServiceId: string; agentId: string; motif: string; urgenceJustification: string; demandeId?: string | null },
  actor: Actor
) {
  const today = new Date().toISOString().slice(0, 10);
  const ticketId = await nextTicketId(today, "URG");

  const [row] = await db
    .insert(rendezVous)
    .values({
      id: newId("rdv"),
      demandeId: data.demandeId ?? null,
      userId: data.userId,
      subServiceId: data.subServiceId,
      agentId: data.agentId,
      slotId: null,
      date: today,
      ticketId,
      type: "URGENCE",
      status: "CONFIRMED",
      motif: data.motif,
      isUrgent: true,
      urgenceJustification: data.urgenceJustification,
      createdBy: actor.userId,
    })
    .returning();
  return enrichRendezVous(row);
}

async function setStatus(id: string, status: string, extra: Partial<typeof rendezVous.$inferInsert> = {}) {
  const [existing] = await db.select().from(rendezVous).where(eq(rendezVous.id, id));
  if (!existing) throw new NotFoundError("Rendez-vous introuvable");

  const [updated] = await db
    .update(rendezVous)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(rendezVous.id, id))
    .returning();

  // Le citoyen est prévenu quand l'ambassade confirme / annule / constate une absence.
  const event = existing.status !== status && updated.userId ? notificationsLogic.rendezVousEventForStatus(status) : null;
  if (event && updated.userId) {
    const sub = await getSubServiceShallow(updated.subServiceId);
    await notificationsLogic.notifyRendezVous(db, {
      userId: updated.userId,
      rendezVousId: updated.id,
      event,
      ticketId: updated.ticketId,
      serviceName: sub?.name,
      date: updated.date,
      startTime: updated.slotId?.split("|")[4] ?? "",
    });
  }
  return enrichRendezVous(updated);
}

/** PATCH /rendez-vous/:id/status */
export async function updateStatus(id: string, status: string, actor: Actor) {
  const [existing] = await db.select().from(rendezVous).where(eq(rendezVous.id, id));
  const result = await setStatus(id, status);
  await writeAudit({
    action: "UPDATE_STATUS",
    entityType: "RENDEZ_VOUS",
    entityId: id,
    actor,
    entitySnapshot: { fromStatus: existing?.status, toStatus: status },
  });
  return result;
}

/** POST /rendez-vous/:id/check-in */
export async function checkIn(id: string) {
  return setStatus(id, "CHECKED_IN", { checkedInAt: new Date() });
}

/** POST /rendez-vous/:id/complete */
export async function completeRendezVous(id: string) {
  return setStatus(id, "COMPLETED", { completedAt: new Date() });
}

/** POST /rendez-vous/:id/cancel */
export async function cancelRendezVous(id: string, cancelledBy: "USER" | "AGENT" = "AGENT") {
  return setStatus(id, cancelledBy === "USER" ? "CANCELLED_BY_USER" : "CANCELLED_BY_AGENT");
}

/** Heure locale de l ambassade (HH:MM) d un instant — pour les urgences, qui n ont pas de créneau planifié. */
function embassyTime(d: Date | null | undefined): string {
  if (!d) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/**
 * Contenu du planning imprimé pour UNE date : seuls les rendez-vous actifs de
 * cette date (les annulés / absents libèrent le créneau et ne s impriment pas),
 * regroupés par service (ordre alphabétique) puis ordonnés par créneau.
 */
function buildScheduleContent(date: string, rows: Awaited<ReturnType<typeof enrichRendezVous>>[]) {
  const active = rows.filter((r) => r.date === date && !CANCELLED_STATUSES.includes(r.status));
  const byServiceMap = new Map<string, { subServiceId: string; subServiceName: string; appointments: any[] }>();
  for (const r of active) {
    const key = r.subServiceId;
    if (!byServiceMap.has(key)) {
      byServiceMap.set(key, { subServiceId: key, subServiceName: (r.subService as any)?.name ?? key, appointments: [] });
    }
    const startTime = r.slotId?.split("|")[4] ?? embassyTime(r.createdAt);
    byServiceMap.get(key)!.appointments.push({
      time: startTime,
      endTime: r.slot?.endTime ?? null,
      ticketId: r.ticketId,
      studentName: [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ") || "N/A",
      studentInue: r.user?.profile?.inue ?? "N/A",
      studentPhone: r.user?.phone ?? null,
      motif: r.motif ?? "",
      status: r.status,
      agentName: [r.agent?.user?.profile?.firstName, r.agent?.user?.profile?.lastName].filter(Boolean).join(" ") || "N/A",
      isUrgent: r.isUrgent,
    });
  }

  const byService = [...byServiceMap.values()]
    .sort((x, y) => x.subServiceName.localeCompare(y.subServiceName, "fr"))
    .map((g) => ({ ...g, appointments: g.appointments.sort((p, q) => p.time.localeCompare(q.time) || p.ticketId.localeCompare(q.ticketId)) }));

  return {
    date,
    generatedAt: new Date().toISOString(),
    totalAppointments: active.length,
    byService,
  };
}

/** POST /rendez-vous/print-daily */
export async function printDaily(params: { date: string; agentId?: string | null; subServiceId?: string | null; format: string }, actor: Actor) {
  const rows = await listRendezVous({
    date: params.date,
    agentId: params.agentId ?? undefined,
    subServiceId: params.subServiceId ?? undefined,
  });
  const content = buildScheduleContent(params.date, rows);

  const [row] = await db
    .insert(dailySchedulePrints)
    .values({
      id: newId("prn"),
      date: params.date,
      agentId: params.agentId ?? null,
      subServiceId: params.subServiceId ?? null,
      printedBy: actor.userId,
      format: params.format,
      content,
      status: "GENERATED",
    })
    .returning();
  return enrichPrint(row);
}

async function enrichPrint(row: typeof dailySchedulePrints.$inferSelect) {
  const [agent, subService, printedByAgent] = await Promise.all([
    row.agentId ? getAgent(row.agentId) : Promise.resolve(null),
    row.subServiceId ? getSubServiceShallow(row.subServiceId) : Promise.resolve(null),
    getAgentByUserId(row.printedBy),
  ]);
  return { ...row, agent, subService, printedByAgent };
}

/** GET /rendez-vous/print-history?date= */
export async function printHistory(date: string) {
  const rows = await db.select().from(dailySchedulePrints).where(eq(dailySchedulePrints.date, date)).orderBy(dailySchedulePrints.printedAt);
  return Promise.all(rows.map(enrichPrint));
}

/** POST /rendez-vous/print/:id/reprint — régénère le contenu (RDV ajoutés depuis), nouvelle ligne REPRINTED. */
export async function reprint(printId: string, actor: Actor) {
  const [original] = await db.select().from(dailySchedulePrints).where(eq(dailySchedulePrints.id, printId));
  if (!original) throw new NotFoundError("Impression introuvable");

  const rows = await listRendezVous({
    date: original.date,
    agentId: original.agentId ?? undefined,
    subServiceId: original.subServiceId ?? undefined,
  });
  const content = buildScheduleContent(original.date, rows);

  const [row] = await db
    .insert(dailySchedulePrints)
    .values({
      id: newId("prn"),
      date: original.date,
      agentId: original.agentId,
      subServiceId: original.subServiceId,
      printedBy: actor.userId,
      format: original.format,
      content,
      status: "REPRINTED",
    })
    .returning();
  return enrichPrint(row);
}

/**
 * Espace d'échange demandeur ↔ agents sur un rendez-vous — même modèle que
 * demande_comments (voir [[demande-ux-conventions]]) : isInternal=false =
 * visible du demandeur, isInternal=true = note réservée au staff.
 */

/** Léger lookup pour vérifier la propriété d'un rendez-vous sans l'enrichir entièrement. */
export async function getRendezVousOwnerId(rendezVousId: string): Promise<string | null> {
  const [row] = await db.select({ userId: rendezVous.userId }).from(rendezVous).where(eq(rendezVous.id, rendezVousId));
  if (!row) throw new NotFoundError("Rendez-vous introuvable");
  return row.userId;
}

/** Léger lookup combinant propriétaire + sous-service — évite deux requêtes séparées dans le contrôleur. */
export async function getRendezVousAccessInfo(rendezVousId: string): Promise<{ userId: string | null; subServiceId: string }> {
  const [row] = await db
    .select({ userId: rendezVous.userId, subServiceId: rendezVous.subServiceId })
    .from(rendezVous)
    .where(eq(rendezVous.id, rendezVousId));
  if (!row) throw new NotFoundError("Rendez-vous introuvable");
  return row;
}

export async function listNotes(rendezVousId: string) {
  return db.select().from(rendezVousNotes).where(eq(rendezVousNotes.rendezVousId, rendezVousId)).orderBy(rendezVousNotes.createdAt);
}

/**
 * POST /rendez-vous/:id/notes — un demandeur qui commente son propre
 * rendez-vous ne peut écrire que dans le canal public (isInternal forcé à
 * false), le staff garde le choix public/interne.
 */
export async function addNote(rendezVousId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean) {
  const [existing] = await db.select().from(rendezVous).where(eq(rendezVous.id, rendezVousId));
  if (!existing) throw new NotFoundError("Rendez-vous introuvable");

  const isOwner = existing.userId === actor.userId;

  const [row] = await db
    .insert(rendezVousNotes)
    .values({
      id: newId("note"),
      rendezVousId,
      authorId: actor.userId,
      authorName: await getActorName(actor.userId),
      authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
      content,
      isInternal: isStaff ? isInternal ?? true : false,
    })
    .returning();

  // Un message PUBLIC de l'ambassade prévient le citoyen (in-app + email) ; une note interne ne sort jamais.
  if (isStaff && !row.isInternal && existing.userId && existing.userId !== actor.userId) {
    await notificationsLogic.createNotification(db, {
      userId: existing.userId,
      type: "RDV",
      title: "Nouveau message de l'ambassade",
      body: `À propos de votre rendez-vous ${existing.ticketId} : « ${content.length > 200 ? `${content.slice(0, 200)}…` : content} »`,
      payload: { rendezVousId: existing.id, event: "NOTE" },
      actionUrl: notificationsLogic.RENDEZ_VOUS_ACTION_URL,
      email: { subject: `Message de l'ambassade — ${existing.ticketId}`, actionLabel: "Répondre" },
    });
  }
  return row;
}
