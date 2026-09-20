"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.getActorName = void 0;
exports.getAgent = getAgent;
exports.getAgentByUserId = getAgentByUserId;
exports.getSubServiceShallow = getSubServiceShallow;
exports.getAssignedSubServiceIds = getAssignedSubServiceIds;
const connection_1 = require("../db/connection");
const schema_ambassade_1 = require("../db/schema.ambassade");
const schema_identity_readonly_1 = require("../db/schema.identity-readonly");
const schema_rendezvous_1 = require("../db/schema.rendezvous");
const drizzle_orm_1 = require("drizzle-orm");
const ambassade_core_1 = require("@poramma/ambassade-core");
const getActorName = (userId) => ambassade_core_1.identityLogic.getActorName(connection_1.db, userId);
exports.getActorName = getActorName;
const getUser = (userId) => ambassade_core_1.identityLogic.getUser(connection_1.db, userId);
exports.getUser = getUser;
async function getAgent(agentId) {
    const [agent] = await connection_1.db.select().from(schema_identity_readonly_1.identityAgents).where((0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityAgents.id, agentId));
    if (!agent)
        return null;
    const user = await (0, exports.getUser)(agent.userId);
    return { ...agent, user };
}
async function getAgentByUserId(userId) {
    const [agent] = await connection_1.db.select().from(schema_identity_readonly_1.identityAgents).where((0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityAgents.userId, userId));
    if (!agent)
        return null;
    const user = await (0, exports.getUser)(agent.userId);
    return { ...agent, user };
}
async function getSubServiceShallow(id) {
    const [sub] = await connection_1.db.select().from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, id));
    if (!sub)
        return null;
    const [service] = await connection_1.db.select().from(schema_ambassade_1.services).where((0, drizzle_orm_1.eq)(schema_ambassade_1.services.id, sub.serviceId));
    return { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service };
}
async function getAssignedSubServiceIds(userId) {
    const agent = await getAgentByUserId(userId);
    if (!agent)
        return [];
    const rows = await connection_1.db
        .select({ subServiceId: schema_rendezvous_1.agentServiceAssignments.subServiceId })
        .from(schema_rendezvous_1.agentServiceAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.agentId, agent.id), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.active, true)));
    return rows.map((r) => r.subServiceId);
}
//# sourceMappingURL=enrich.js.map