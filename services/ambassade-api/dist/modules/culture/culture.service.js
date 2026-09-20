"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeFor = scopeFor;
exports.overview = overview;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_demandes_1 = require("../../db/schema.demandes");
const schema_ambassade_1 = require("../../db/schema.ambassade");
const ambassade_core_1 = require("@poramma/ambassade-core");
const enrich_1 = require("../../shared/enrich");
const CANCELLED = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
const OPEN_DEMANDE_STATUSES = ["SUBMITTED", "IN_REVIEW", "ADDITIONAL_INFO_REQUIRED"];
async function scopeFor(userId, roleName) {
    const cultural = await ambassade_core_1.cultureLogic.culturalSubServiceIds(connection_1.db);
    if (roleName === "ADMIN")
        return cultural;
    const assigned = await (0, enrich_1.getAssignedSubServiceIds)(userId);
    return cultural.filter((id) => assigned.includes(id));
}
const fullName = (u) => [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.email || "—";
async function overview(userId, roleName) {
    const scope = await scopeFor(userId, roleName);
    const today = ambassade_core_1.rendezvousLogic.nowInEmbassyTz().date;
    const [threadStats, advisors, rdvRows, demandeRows, subRows] = await Promise.all([
        ambassade_core_1.cultureLogic.threadStats(connection_1.db),
        ambassade_core_1.cultureLogic.listAdvisors(connection_1.db),
        scope.length
            ? connection_1.db
                .select()
                .from(schema_rendezvous_1.rendezVous)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_rendezvous_1.rendezVous.subServiceId, scope), (0, drizzle_orm_1.gte)(schema_rendezvous_1.rendezVous.date, today), (0, drizzle_orm_1.notInArray)(schema_rendezvous_1.rendezVous.status, CANCELLED)))
                .orderBy(schema_rendezvous_1.rendezVous.date, schema_rendezvous_1.rendezVous.createdAt)
                .limit(30)
            : Promise.resolve([]),
        scope.length
            ? connection_1.db
                .select()
                .from(schema_demandes_1.demandes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.subServiceId, scope), (0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.status, OPEN_DEMANDE_STATUSES)))
                .orderBy((0, drizzle_orm_1.desc)(schema_demandes_1.demandes.submittedAt))
                .limit(20)
            : Promise.resolve([]),
        scope.length ? connection_1.db.select({ id: schema_ambassade_1.subServices.id, name: schema_ambassade_1.subServices.name }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.inArray)(schema_ambassade_1.subServices.id, scope)) : Promise.resolve([]),
    ]);
    const users = await ambassade_core_1.identityLogic.getUsersByIds(connection_1.db, [...rdvRows.map((r) => r.userId), ...demandeRows.map((d) => d.userId)].filter((x) => !!x));
    const subName = (id) => subRows.find((s) => s.id === id)?.name ?? "—";
    const requester = (id) => {
        if (!id)
            return { id: null, name: "Personne sans compte", phone: null, email: null, inue: null };
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
//# sourceMappingURL=culture.service.js.map