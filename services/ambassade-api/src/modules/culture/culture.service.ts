import { and, desc, gte, inArray, notInArray } from "drizzle-orm";
import { db } from "../../db/connection";
import { rendezVous } from "../../db/schema.rendezvous";
import { demandes } from "../../db/schema.demandes";
import { subServices } from "../../db/schema.ambassade";
import { cultureLogic, rendezvousLogic, identityLogic } from "@poramma/ambassade-core";
import { getAssignedSubServiceIds } from "../../shared/enrich";

const CANCELLED = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
const OPEN_DEMANDE_STATUSES = ["SUBMITTED", "IN_REVIEW", "ADDITIONAL_INFO_REQUIRED"];

/**
 * Sous-services culturels que cet utilisateur peut suivre : tous pour l'administrateur,
 * ceux auxquels il est affecté pour le Conseiller Culturel.
 */
export async function scopeFor(userId: string, roleName: string | null): Promise<string[]> {
  const cultural = await cultureLogic.culturalSubServiceIds(db);
  if (roleName === "ADMIN") return cultural;
  const assigned = await getAssignedSubServiceIds(userId);
  return cultural.filter((id) => assigned.includes(id));
}

const fullName = (u: { profile?: { firstName?: string | null; lastName?: string | null } | null; email?: string } | null | undefined) =>
  [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.email || "—";

/** Tableau de bord du Conseiller Culturel : échanges à traiter, rendez-vous à venir, demandes ouvertes. */
export async function overview(userId: string, roleName: string | null) {
  const scope = await scopeFor(userId, roleName);
  const today = rendezvousLogic.nowInEmbassyTz().date;

  const [threadStats, advisors, rdvRows, demandeRows, subRows] = await Promise.all([
    cultureLogic.threadStats(db),
    cultureLogic.listAdvisors(db),
    scope.length
      ? db
          .select()
          .from(rendezVous)
          .where(and(inArray(rendezVous.subServiceId, scope), gte(rendezVous.date, today), notInArray(rendezVous.status, CANCELLED)))
          .orderBy(rendezVous.date, rendezVous.createdAt)
          .limit(30)
      : Promise.resolve([]),
    scope.length
      ? db
          .select()
          .from(demandes)
          .where(and(inArray(demandes.subServiceId, scope), inArray(demandes.status, OPEN_DEMANDE_STATUSES)))
          .orderBy(desc(demandes.submittedAt))
          .limit(20)
      : Promise.resolve([]),
    scope.length ? db.select({ id: subServices.id, name: subServices.name }).from(subServices).where(inArray(subServices.id, scope)) : Promise.resolve([]),
  ]);

  const users = await identityLogic.getUsersByIds(db, [...rdvRows.map((r) => r.userId), ...demandeRows.map((d) => d.userId)].filter((x): x is string => !!x));
  const subName = (id: string) => subRows.find((s) => s.id === id)?.name ?? "—";
  const requester = (id: string | null) => {
    if (!id) return { id: null, name: "Personne sans compte", phone: null, email: null, inue: null };
    const u = users.get(id);
    return { id, name: fullName(u), phone: u?.phone ?? null, email: u?.email ?? null, inue: u?.profile?.inue ?? null };
  };

  const upcomingRendezVous = rdvRows.map((r) => ({
    id: r.id,
    ticketId: r.ticketId,
    date: r.date,
    startTime: r.slotId?.split("|")[4] ?? null,
    status: r.status,
    motif: r.motif,
    subServiceName: subName(r.subServiceId),
    requester: requester(r.userId),
  }));

  const openDemandes = demandeRows.map((d) => ({
    id: d.id,
    dossierNumber: d.dossierNumber,
    status: d.status,
    submittedAt: d.submittedAt,
    deadlineAt: d.deadlineAt,
    subServiceName: subName(d.subServiceId),
    requester: requester(d.userId),
    payload: d.customPayload,
  }));

  return {
    advisors: advisors.map((a) => ({ name: a.name, title: a.title })),
    stats: {
      threadsToHandle: threadStats.open,
      threadsAnswered: threadStats.answered,
      rendezVousToday: upcomingRendezVous.filter((r) => r.date === today).length,
      rendezVousUpcoming: upcomingRendezVous.length,
      demandesOpen: openDemandes.length,
    },
    upcomingRendezVous,
    openDemandes,
  };
}
