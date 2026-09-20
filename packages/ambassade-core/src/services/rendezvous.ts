import crypto from "crypto";
import { and, eq, gte, inArray, like, lte, sql } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";
import type { Db } from "../db-type";
import { subServices, services, serviceSchedules, serviceExceptions } from "../schema/services";
import { demandes } from "../schema/demandes";
import { agentServiceAssignments, agentAvailabilities, agentExceptions, rendezVous, rendezVousNotes } from "../schema/rendezvous";
import { identityUserProfiles } from "../schema/identity";
import { writeAudit } from "./audit";
import { notifyRendezVous } from "./notifications";
import { notifyAdvisorRendezVous, listAdvisors } from "./culture";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const TZ = "Africa/Casablanca";
/** Horizon de réservation : un citoyen ne peut réserver que dans les N prochains jours. */
export const BOOKING_HORIZON_DAYS = 60;
/** Statuts qui libèrent le créneau (miroir de l'index unique partiel `rendez_vous_active_slot_uq`). */
export const RELEASED_STATUSES = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
/** Un rendez-vous dans l'un de ces statuts peut être annulé / déplacé par son titulaire. */
export const MODIFIABLE_STATUSES = ["PENDING", "CONFIRMED"];

// ---------------------------------------------------------------- dates / heures

/** Lundi=1 .. Dimanche=7 (JS Date.getDay() est Dimanche=0). */
export function isoDayOfWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "HH:MM:SS" (colonne time) → "HH:MM". */
const hhmm = (t: string) => t.slice(0, 5);

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Date et minute courantes à Rabat (les créneaux sont exprimés en heure locale de l'ambassade). */
export function nowInEmbassyTz(now = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function assertBookableDate(date: string) {
  if (!DATE_RE.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new ValidationError("Date invalide", { date: ["Format attendu : AAAA-MM-JJ"] });
  }
  const today = nowInEmbassyTz().date;
  if (date < today) throw new ValidationError("Cette date est passée", { date: ["Choisissez une date à venir"] });
  if (date > addDays(today, BOOKING_HORIZON_DAYS)) {
    throw new ValidationError(`Les rendez-vous ne peuvent être pris que dans les ${BOOKING_HORIZON_DAYS} prochains jours`, {
      date: ["Date trop éloignée"],
    });
  }
}

function isPast(date: string, startMinutes: number, now = nowInEmbassyTz()): boolean {
  return date < now.date || (date === now.date && startMinutes <= now.minutes);
}

function withinValidity(date: string, validFrom: string | null, validUntil: string | null): boolean {
  if (validFrom && date < validFrom) return false;
  if (validUntil && date > validUntil) return false;
  return true;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// ---------------------------------------------------------------- génération des créneaux

export interface RawSlot {
  /** Id virtuel `slot|<subServiceId>|<agentId>|<date>|<HH:MM>` — jamais matérialisé en table. */
  id: string;
  subServiceId: string;
  agentId: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Réservations simultanées maximum sur cette heure, tous agents confondus (service_schedules.max_concurrent_slots). */
  maxConcurrent: number;
  /** Plafond journalier de l'agent pour ce sous-service (agent_service_assignments.max_daily_appointments). */
  maxDailyForAgent: number | null;
}

export function slotId(subServiceId: string, agentId: string, date: string, startTime: string): string {
  return `slot|${subServiceId}|${agentId}|${date}|${startTime}`;
}

interface Ctx {
  subServiceId: string;
  schedules: (typeof serviceSchedules.$inferSelect)[];
  exceptions: (typeof serviceExceptions.$inferSelect)[];
  assignments: (typeof agentServiceAssignments.$inferSelect)[];
  availabilities: (typeof agentAvailabilities.$inferSelect)[];
  agentExc: (typeof agentExceptions.$inferSelect)[];
  /** Rendez-vous actifs du sous-service sur la période (créneaux planifiés uniquement). */
  bookings: { slotId: string | null; agentId: string; date: string }[];
}

/** Charge en quelques requêtes tout ce qu'il faut pour calculer les créneaux d'une plage de dates. */
async function loadContext(db: Db, subServiceId: string, from: string, to: string): Promise<Ctx> {
  const [schedules, exceptions, assignments] = await Promise.all([
    db.select().from(serviceSchedules).where(and(eq(serviceSchedules.subServiceId, subServiceId), eq(serviceSchedules.isActive, true))),
    db
      .select()
      .from(serviceExceptions)
      .where(and(eq(serviceExceptions.subServiceId, subServiceId), gte(serviceExceptions.date, from), lte(serviceExceptions.date, to))),
    db
      .select()
      .from(agentServiceAssignments)
      .where(and(eq(agentServiceAssignments.subServiceId, subServiceId), eq(agentServiceAssignments.active, true))),
  ]);

  const agentIds = [...new Set(assignments.map((a) => a.agentId))];
  const [availabilities, agentExc, bookings] = await Promise.all([
    agentIds.length
      ? db
          .select()
          .from(agentAvailabilities)
          .where(and(inArray(agentAvailabilities.agentId, agentIds), eq(agentAvailabilities.isAvailable, true)))
      : Promise.resolve([]),
    agentIds.length
      ? db
          .select()
          .from(agentExceptions)
          .where(and(inArray(agentExceptions.agentId, agentIds), gte(agentExceptions.date, from), lte(agentExceptions.date, to)))
      : Promise.resolve([]),
    db
      .select({ slotId: rendezVous.slotId, agentId: rendezVous.agentId, date: rendezVous.date })
      .from(rendezVous)
      .where(
        and(
          eq(rendezVous.subServiceId, subServiceId),
          gte(rendezVous.date, from),
          lte(rendezVous.date, to),
          sql`${rendezVous.status} not in ('CANCELLED_BY_USER','CANCELLED_BY_AGENT','NO_SHOW')`
        )
      ),
  ]);

  return { subServiceId, schedules, exceptions, assignments, availabilities, agentExc, bookings };
}

/**
 * Règle de disponibilité : un créneau existe quand l'heure est dans les
 * horaires du service (service_schedules, hors fermetures) ET qu'au moins un
 * agent affecté à ce service est disponible à cette heure (disponibilité
 * hebdomadaire, hors absences). Un service est donc « disponible » dès qu'au
 * moins un de ses agents l'est.
 */
function slotsForDate(ctx: Ctx, date: string): RawSlot[] {
  const dayOfWeek = isoDayOfWeek(date);

  const schedules = ctx.schedules.filter((s) => s.dayOfWeek === dayOfWeek && withinValidity(date, s.validFrom, s.validUntil));
  if (!schedules.length) return [];

  const dayExceptions = ctx.exceptions.filter((e) => e.date === date);
  if (dayExceptions.some((e) => e.type === "CLOSED")) return [];
  const special = dayExceptions.find((e) => e.type === "SPECIAL_HOURS" && e.startTime && e.endTime);

  const assignments = ctx.assignments.filter((a) => withinValidity(date, a.validFrom, a.validUntil));
  if (!assignments.length) return [];

  const out: RawSlot[] = [];
  for (const schedule of schedules) {
    const windowStart = timeToMinutes(special ? special.startTime! : schedule.startTime);
    const windowEnd = timeToMinutes(special ? special.endTime! : schedule.endTime);
    const duration = schedule.slotDurationMinutes;
    if (duration <= 0) continue;

    for (const assignment of assignments) {
      const availability = ctx.availabilities.find(
        (a) => a.agentId === assignment.agentId && a.dayOfWeek === dayOfWeek && a.startTime && a.endTime && withinValidity(date, a.validFrom, a.validUntil)
      );
      if (!availability) continue;

      const start = Math.max(windowStart, timeToMinutes(availability.startTime!));
      const end = Math.min(windowEnd, timeToMinutes(availability.endTime!));
      if (start >= end) continue;

      const exc = ctx.agentExc.filter((e) => e.agentId === assignment.agentId && e.date === date);
      if (exc.some((e) => e.isFullDay)) continue;
      const partial = exc
        .filter((e) => !e.isFullDay && e.startTime && e.endTime)
        .map((e) => [timeToMinutes(e.startTime!), timeToMinutes(e.endTime!)] as const);

      for (let t = start; t + duration <= end; t += duration) {
        if (partial.some(([exStart, exEnd]) => t < exEnd && t + duration > exStart)) continue;
        const startTime = minutesToTime(t);
        out.push({
          id: slotId(ctx.subServiceId, assignment.agentId, date, startTime),
          subServiceId: ctx.subServiceId,
          agentId: assignment.agentId,
          date,
          startTime,
          endTime: minutesToTime(t + duration),
          maxConcurrent: schedule.maxConcurrentSlots,
          maxDailyForAgent: assignment.maxDailyAppointments ?? null,
        });
      }
    }
  }
  return out;
}

/** Créneaux bruts (un par agent × heure) d'un sous-service pour une date — utilisé par la vue agent d'ambassade-api. */
export async function computeSlots(db: Db, subServiceId: string, date: string, filterAgentId?: string): Promise<RawSlot[]> {
  const ctx = await loadContext(db, subServiceId, date, date);
  const slots = slotsForDate(ctx, date);
  return filterAgentId ? slots.filter((s) => s.agentId === filterAgentId) : slots;
}

// ---------------------------------------------------------------- vue citoyen (agent jamais exposé)

export interface PublicSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

/** Regroupe les créneaux par heure : disponible = au moins un agent libre (sous son plafond journalier) et pas au-delà des réservations simultanées permises. */
function publicSlotsForDate(ctx: Ctx, date: string, now = nowInEmbassyTz()): { slots: PublicSlot[]; free: Map<string, RawSlot[]> } {
  const raw = slotsForDate(ctx, date);
  const bookedIds = new Set(ctx.bookings.filter((b) => b.date === date && b.slotId).map((b) => b.slotId!));
  const dailyCount = (agentId: string) => ctx.bookings.filter((b) => b.date === date && b.agentId === agentId).length;

  const byTime = new Map<string, RawSlot[]>();
  for (const s of raw) {
    if (isPast(date, timeToMinutes(s.startTime), now)) continue;
    (byTime.get(s.startTime) ?? byTime.set(s.startTime, []).get(s.startTime)!).push(s);
  }

  const slots: PublicSlot[] = [];
  const free = new Map<string, RawSlot[]>();
  for (const [startTime, group] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const bookedInGroup = group.filter((s) => bookedIds.has(s.id)).length;
    const maxConcurrent = Math.min(...group.map((s) => s.maxConcurrent));
    const candidates = group.filter((s) => !bookedIds.has(s.id) && (s.maxDailyForAgent == null || dailyCount(s.agentId) < s.maxDailyForAgent));
    const available = candidates.length > 0 && bookedInGroup < maxConcurrent;
    slots.push({ date, startTime, endTime: group[0].endTime, isAvailable: available });
    if (available) free.set(startTime, candidates);
  }
  return { slots, free };
}

async function assertBookableSubService(db: Db, subServiceId: string) {
  const [sub] = await db.select({ id: subServices.id, active: subServices.active }).from(subServices).where(eq(subServices.id, subServiceId));
  if (!sub || !sub.active) throw new NotFoundError("Service introuvable");
}

/** Créneaux d'une date pour un service, sans jamais révéler d'agent. Les créneaux passés sont exclus. */
export async function listPublicSlots(db: Db, params: { subServiceId: string; date: string }): Promise<PublicSlot[]> {
  assertBookableDate(params.date);
  await assertBookableSubService(db, params.subServiceId);
  const ctx = await loadContext(db, params.subServiceId, params.date, params.date);
  return publicSlotsForDate(ctx, params.date).slots;
}

/** Dates des `days` prochains jours qui ont au moins un créneau libre (pour griser le calendrier). */
export async function listAvailableDates(db: Db, params: { subServiceId: string; days?: number }): Promise<string[]> {
  await assertBookableSubService(db, params.subServiceId);
  const days = Math.min(Math.max(params.days ?? 30, 1), BOOKING_HORIZON_DAYS);
  const now = nowInEmbassyTz();
  const to = addDays(now.date, days);
  const ctx = await loadContext(db, params.subServiceId, now.date, to);

  const dates: string[] = [];
  for (let d = now.date; d <= to; d = addDays(d, 1)) {
    if (publicSlotsForDate(ctx, d, now).slots.some((s) => s.isAvailable)) dates.push(d);
  }
  return dates;
}

// ---------------------------------------------------------------- réservation

type RendezVousRow = typeof rendezVous.$inferSelect;

async function nextTicketId(db: Pick<Db, "select">, date: string, prefix: "RDV" | "URG"): Promise<string> {
  const compact = date.replace(/-/g, "");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rendezVous)
    .where(like(rendezVous.ticketId, `${prefix}-${compact}-%`));
  return `${prefix}-${compact}-${String(count + 1).padStart(3, "0")}`;
}

export { nextTicketId };

/** Agent le moins chargé du jour parmi les candidats (répartition équitable ; départ à égalité par id pour un résultat stable). */
function pickAgent(candidates: RawSlot[], ctx: Ctx, date: string): RawSlot {
  const load = (agentId: string) => ctx.bookings.filter((b) => b.date === date && b.agentId === agentId).length;
  return [...candidates].sort((a, b) => load(a.agentId) - load(b.agentId) || a.agentId.localeCompare(b.agentId))[0];
}

const SLOT_TAKEN = () => new ValidationError("Ce créneau n'est plus disponible. Veuillez en choisir un autre.", { startTime: ["already booked"] });

/**
 * Réservation citoyenne : le citoyen choisit un service, une date et une
 * heure — jamais un agent. L'agent est choisi ici (le moins chargé parmi ceux
 * disponibles). Sûr en concurrence grâce à l'index unique partiel sur slot_id :
 * en cas de collision, on recalcule les candidats et on réessaie.
 */
export async function bookForUser(
  db: Db,
  params: { userId: string; subServiceId: string; date: string; startTime: string; motif?: string | null; demandeId?: string | null; ip?: string | null }
): Promise<RendezVousRow> {
  if (!TIME_RE.test(params.startTime)) throw new ValidationError("Heure invalide", { startTime: ["Format attendu : HH:MM"] });
  assertBookableDate(params.date);
  await assertBookableSubService(db, params.subServiceId);
  // Le motif est obligatoire : l'agent (ou le Conseiller Culturel) prépare le rendez-vous à partir de lui.
  if (!params.motif || params.motif.trim().length < 3) {
    throw new ValidationError("Précisez le motif de votre rendez-vous.", { motif: ["Le motif est obligatoire (3 caractères minimum)"] });
  }

  if (params.demandeId) {
    const [demande] = await db.select({ userId: demandes.userId }).from(demandes).where(eq(demandes.id, params.demandeId));
    if (!demande || demande.userId !== params.userId) throw new NotFoundError("Demande introuvable");
  }

  // Un seul rendez-vous actif par service : évite d'accaparer des créneaux ; pour changer, on déplace ou on annule.
  const [alreadyActive] = await db
    .select({ id: rendezVous.id })
    .from(rendezVous)
    .where(
      and(
        eq(rendezVous.userId, params.userId),
        eq(rendezVous.subServiceId, params.subServiceId),
        inArray(rendezVous.status, MODIFIABLE_STATUSES),
        gte(rendezVous.date, nowInEmbassyTz().date)
      )
    );
  if (alreadyActive) {
    throw new ValidationError("Vous avez déjà un rendez-vous en cours pour ce service. Déplacez-le ou annulez-le pour en prendre un nouveau.", {
      subServiceId: ["active appointment exists"],
    });
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const ctx = await loadContext(db, params.subServiceId, params.date, params.date);
    const { free } = publicSlotsForDate(ctx, params.date);
    const candidates = free.get(params.startTime);
    if (!candidates?.length) throw SLOT_TAKEN();

    const chosen = pickAgent(candidates, ctx, params.date);
    try {
      const created = await db.transaction(async (tx) => {
        const ticketId = await nextTicketId(tx, params.date, "RDV");
        const [row] = await tx
          .insert(rendezVous)
          .values({
            id: newId("rdv"),
            demandeId: params.demandeId ?? null,
            userId: params.userId,
            subServiceId: params.subServiceId,
            agentId: chosen.agentId,
            slotId: chosen.id,
            date: params.date,
            ticketId,
            type: "STANDARD",
            status: "PENDING",
            motif: params.motif ?? null,
            createdBy: params.userId,
          })
          .returning();

        await writeAudit(db, {
          action: "CREATE",
          entityType: "RENDEZ_VOUS",
          entityId: row.id,
          actor: { userId: params.userId, roleName: null },
          entitySnapshot: { type: "STANDARD", subServiceId: params.subServiceId, date: params.date, startTime: params.startTime },
          details: { ticketId, selfService: true },
          ip: params.ip,
          tx,
        });
        return row;
      });

      // Après validation de la transaction : une erreur ici ne doit jamais faire croire que la réservation a échoué.
      try {
        const [sub] = await db.select({ name: subServices.name }).from(subServices).where(eq(subServices.id, params.subServiceId));
        await notifyRendezVous(db, {
          userId: params.userId,
          rendezVousId: created.id,
          event: "BOOKED",
          ticketId: created.ticketId,
          serviceName: sub?.name,
          date: created.date,
          startTime: params.startTime,
        });
      } catch (err) {
        console.error("[rendezvous] notification de réservation échouée", err);
      }
      await notifyAdvisorRendezVous(db, { agentId: created.agentId, event: "BOOKED", userId: params.userId, ticketId: created.ticketId, date: created.date, startTime: params.startTime });
      return created;
    } catch (err) {
      if (isUniqueViolation(err)) continue; // créneau ou ticket pris entre-temps → on recalcule
      throw err;
    }
  }
  throw SLOT_TAKEN();
}

// ---------------------------------------------------------------- lecture / annulation / déplacement (titulaire)

export interface OwnRendezVous {
  row: RendezVousRow;
  startTime: string;
  endTime: string;
  subService: { id: string; name: string; serviceName: string | null; isCultural: boolean } | null;
  /** Conseiller Culturel du rendez-vous, montré à visage découvert — null pour un service consulaire (agent anonyme). */
  advisor: { name: string; title: string } | null;
  canModify: boolean;
}

async function describe(db: Db, rows: RendezVousRow[]): Promise<OwnRendezVous[]> {
  if (!rows.length) return [];
  const subIds = [...new Set(rows.map((r) => r.subServiceId))];
  const [subs, schedules] = await Promise.all([
    db
      .select({ id: subServices.id, name: subServices.name, serviceName: services.name, isCultural: services.isCultural })
      .from(subServices)
      .leftJoin(services, eq(subServices.serviceId, services.id))
      .where(inArray(subServices.id, subIds)),
    db.select().from(serviceSchedules).where(inArray(serviceSchedules.subServiceId, subIds)),
  ]);
  const now = nowInEmbassyTz();
  const advisors = subs.some((s) => s.isCultural) ? await listAdvisors(db) : [];

  return rows.map((row) => {
    const startTime = row.slotId?.split("|")[4] ?? "00:00";
    const schedule = schedules.find((s) => s.subServiceId === row.subServiceId && s.dayOfWeek === isoDayOfWeek(row.date));
    const endTime = minutesToTime(timeToMinutes(startTime) + (schedule?.slotDurationMinutes ?? 30));
    const sub = subs.find((s) => s.id === row.subServiceId);
    const advisor = sub?.isCultural ? advisors.find((a) => a.agentId === row.agentId) : undefined;
    return {
      row,
      startTime,
      endTime,
      subService: sub ? { id: sub.id, name: sub.name, serviceName: sub.serviceName ?? null, isCultural: !!sub.isCultural } : null,
      advisor: advisor ? { name: advisor.name, title: advisor.title } : null,
      canModify: MODIFIABLE_STATUSES.includes(row.status) && !!row.slotId && !isPast(row.date, timeToMinutes(startTime), now),
    };
  });
}

export async function listByUser(db: Db, userId: string): Promise<OwnRendezVous[]> {
  const rows = await db.select().from(rendezVous).where(eq(rendezVous.userId, userId)).orderBy(rendezVous.date, rendezVous.createdAt);
  return describe(db, rows);
}

async function getOwnedRow(db: Db, userId: string, id: string): Promise<RendezVousRow> {
  const [row] = await db.select().from(rendezVous).where(and(eq(rendezVous.id, id), eq(rendezVous.userId, userId)));
  if (!row) throw new NotFoundError("Rendez-vous introuvable");
  return row;
}

export async function getOwned(db: Db, userId: string, id: string): Promise<OwnRendezVous> {
  return (await describe(db, [await getOwnedRow(db, userId, id)]))[0];
}

/**
 * Espace d'échange citoyen ↔ ambassade autour d'un rendez-vous (même modèle que
 * les commentaires de demande) : le citoyen ne voit que les notes PUBLIQUES
 * (isInternal=false) et n'écrit que dans ce canal.
 */
export async function listNotesForUser(db: Db, userId: string, id: string) {
  await getOwnedRow(db, userId, id);
  const rows = await db.select().from(rendezVousNotes).where(and(eq(rendezVousNotes.rendezVousId, id), eq(rendezVousNotes.isInternal, false))).orderBy(rendezVousNotes.createdAt);
  return rows;
}

export async function addNoteByUser(db: Db, params: { userId: string; id: string; content: string; ip?: string | null }) {
  const row = await getOwnedRow(db, params.userId, params.id);
  if (RELEASED_STATUSES.includes(row.status)) {
    throw new ValidationError("Ce rendez-vous est annulé : l'échange est clos.", { status: ["closed"] });
  }
  const [profile] = await db
    .select({ firstName: identityUserProfiles.firstName, lastName: identityUserProfiles.lastName })
    .from(identityUserProfiles)
    .where(eq(identityUserProfiles.userId, params.userId));
  const authorName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Citoyen";

  const [note] = await db
    .insert(rendezVousNotes)
    .values({
      id: newId("note"),
      rendezVousId: params.id,
      authorId: params.userId,
      authorName,
      authorType: "STUDENT",
      content: params.content,
      isInternal: false,
    })
    .returning();

  await writeAudit(db, {
    action: "NOTE",
    entityType: "RENDEZ_VOUS",
    entityId: params.id,
    actor: { userId: params.userId, roleName: null },
    details: { selfService: true },
    ip: params.ip,
  });
  return note;
}

function assertModifiable(item: OwnRendezVous, verb: string) {
  if (!MODIFIABLE_STATUSES.includes(item.row.status)) {
    throw new ValidationError(`Ce rendez-vous ne peut plus être ${verb} (statut actuel : ${item.row.status}).`, { status: ["not modifiable"] });
  }
  if (!item.canModify) throw new ValidationError(`Ce rendez-vous est passé : il ne peut plus être ${verb}.`, { date: ["in the past"] });
}

export async function cancelByUser(db: Db, params: { userId: string; id: string; reason?: string | null; ip?: string | null }): Promise<OwnRendezVous> {
  const item = await getOwned(db, params.userId, params.id);
  assertModifiable(item, "annulé");

  const [row] = await db.transaction(async (tx) => {
    // La garde de statut dans le WHERE protège d'un changement concurrent (ex. l'agent vient de le passer en CHECKED_IN).
    const updated = await tx
      .update(rendezVous)
      .set({ status: "CANCELLED_BY_USER", updatedAt: new Date() })
      .where(and(eq(rendezVous.id, params.id), eq(rendezVous.userId, params.userId), inArray(rendezVous.status, MODIFIABLE_STATUSES)))
      .returning();
    if (!updated.length) throw new ValidationError("Ce rendez-vous ne peut plus être annulé.", { status: ["changed"] });
    await writeAudit(db, {
      action: "CANCEL",
      entityType: "RENDEZ_VOUS",
      entityId: params.id,
      actor: { userId: params.userId, roleName: null },
      entitySnapshot: { fromStatus: item.row.status, toStatus: "CANCELLED_BY_USER" },
      details: { reason: params.reason ?? null, selfService: true },
      ip: params.ip,
      tx,
    });
    return updated;
  });

  await notifyRendezVous(db, {
    userId: params.userId,
    rendezVousId: row.id,
    event: "CANCELLED_BY_USER",
    ticketId: row.ticketId,
    serviceName: item.subService?.name,
    date: row.date,
    startTime: item.startTime,
  });
  await notifyAdvisorRendezVous(db, { agentId: row.agentId, event: "CANCELLED", userId: params.userId, ticketId: row.ticketId, date: row.date, startTime: item.startTime });
  return { ...item, row, canModify: false };
}

/** Déplace le rendez-vous sur un autre créneau du même service (même identifiant, nouveau ticket, retour à PENDING pour reconfirmation). */
export async function rescheduleByUser(
  db: Db,
  params: { userId: string; id: string; date: string; startTime: string; ip?: string | null }
): Promise<OwnRendezVous> {
  if (!TIME_RE.test(params.startTime)) throw new ValidationError("Heure invalide", { startTime: ["Format attendu : HH:MM"] });
  assertBookableDate(params.date);

  const item = await getOwned(db, params.userId, params.id);
  assertModifiable(item, "déplacé");
  if (item.row.slotId?.endsWith(`|${params.date}|${params.startTime}`)) {
    throw new ValidationError("C'est déjà l'horaire de votre rendez-vous.", { startTime: ["unchanged"] });
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const ctx = await loadContext(db, item.row.subServiceId, params.date, params.date);
    const { free } = publicSlotsForDate(ctx, params.date);
    const candidates = free.get(params.startTime);
    if (!candidates?.length) throw SLOT_TAKEN();
    const chosen = pickAgent(candidates, ctx, params.date);

    try {
      const updated = await db.transaction(async (tx) => {
        const ticketId = await nextTicketId(tx, params.date, "RDV");
        const rows = await tx
          .update(rendezVous)
          .set({ slotId: chosen.id, agentId: chosen.agentId, date: params.date, ticketId, status: "PENDING", updatedAt: new Date() })
          .where(and(eq(rendezVous.id, params.id), eq(rendezVous.userId, params.userId), inArray(rendezVous.status, MODIFIABLE_STATUSES)))
          .returning();
        if (!rows.length) throw new ValidationError("Ce rendez-vous ne peut plus être déplacé.", { status: ["changed"] });
        await writeAudit(db, {
          action: "RESCHEDULE",
          entityType: "RENDEZ_VOUS",
          entityId: params.id,
          actor: { userId: params.userId, roleName: null },
          entitySnapshot: { from: { date: item.row.date, startTime: item.startTime }, to: { date: params.date, startTime: params.startTime } },
          details: { previousTicketId: item.row.ticketId, ticketId, selfService: true },
          ip: params.ip,
          tx,
        });
        return rows[0];
      });

      await notifyRendezVous(db, {
        userId: params.userId,
        rendezVousId: updated.id,
        event: "RESCHEDULED",
        ticketId: updated.ticketId,
        serviceName: item.subService?.name,
        date: updated.date,
        startTime: params.startTime,
      });
      await notifyAdvisorRendezVous(db, { agentId: updated.agentId, event: "RESCHEDULED", userId: params.userId, ticketId: updated.ticketId, date: updated.date, startTime: params.startTime });
      return getOwned(db, params.userId, params.id);
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  throw SLOT_TAKEN();
}

/** Détecte l'erreur d'unicité du créneau (ex. réservation staff concurrente) pour la traduire en message clair. */
export const isSlotConflict = isUniqueViolation;
