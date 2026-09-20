"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
exports.updateMyProfile = updateMyProfile;
exports.updateMyPreferences = updateMyPreferences;
exports.updateMyPassword = updateMyPassword;
exports.uploadSignature = uploadSignature;
exports.getSignatureFile = getSignatureFile;
exports.deleteSignature = deleteSignature;
exports.listActivities = listActivities;
exports.recordActivity = recordActivity;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const schema_ambassade_readonly_1 = require("../../db/schema.ambassade-readonly");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const storage_1 = require("@poramma/storage");
const auth_service_1 = require("../auth/auth.service");
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
const DEFAULT_PREFERENCES = {
    theme: "system",
    language: "fr",
    notificationsEmail: true,
    notificationsInApp: true,
    notificationTypes: {
        demandeAssigned: true,
        documentPending: true,
        rendezVousReminder: true,
    },
};
async function getAgentRow(userId) {
    const [agent] = await connection_1.db.select().from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.userId, userId));
    if (!agent)
        throw new utils_1.NotFoundError("Aucun profil agent pour cet utilisateur");
    return agent;
}
async function getMyProfile(userId) {
    const agent = await getAgentRow(userId);
    const fullUser = await (0, auth_service_1.buildFullUser)(userId);
    const [assignments, availabilities, exceptions] = await Promise.all([
        connection_1.db.select().from(schema_ambassade_readonly_1.agentServiceAssignments).where((0, drizzle_orm_1.eq)(schema_ambassade_readonly_1.agentServiceAssignments.agentId, agent.id)),
        connection_1.db.select().from(schema_ambassade_readonly_1.agentAvailabilities).where((0, drizzle_orm_1.eq)(schema_ambassade_readonly_1.agentAvailabilities.agentId, agent.id)),
        connection_1.db.select().from(schema_ambassade_readonly_1.agentExceptions).where((0, drizzle_orm_1.eq)(schema_ambassade_readonly_1.agentExceptions.agentId, agent.id)),
    ]);
    const subIds = [...new Set(assignments.map((a) => a.subServiceId))];
    const subRows = subIds.length
        ? await connection_1.db
            .select({ id: schema_ambassade_readonly_1.subServices.id, name: schema_ambassade_readonly_1.subServices.name, code: schema_ambassade_readonly_1.subServices.code, description: schema_ambassade_readonly_1.subServices.description, serviceName: schema_ambassade_readonly_1.services.name, serviceId: schema_ambassade_readonly_1.services.id })
            .from(schema_ambassade_readonly_1.subServices)
            .leftJoin(schema_ambassade_readonly_1.services, (0, drizzle_orm_1.eq)(schema_ambassade_readonly_1.services.id, schema_ambassade_readonly_1.subServices.serviceId))
            .where((0, drizzle_orm_1.inArray)(schema_ambassade_readonly_1.subServices.id, subIds))
        : [];
    const namedAssignments = assignments
        .map((a) => {
        const sub = subRows.find((r) => r.id === a.subServiceId);
        return {
            ...a,
            subService: sub ? { id: sub.id, name: sub.name, code: sub.code, description: sub.description, service: { id: sub.serviceId, name: sub.serviceName } } : null,
        };
    })
        .sort((x, y) => Number(!!y.active) - Number(!!x.active) || Number(!!y.isPrimary) - Number(!!x.isPrimary));
    return {
        agent: {
            id: agent.id,
            userId: agent.userId,
            user: fullUser,
            matricule: agent.matricule,
            roleTitle: agent.roleTitle,
            department: agent.department,
            officeNumber: agent.officeNumber,
            signatureUrl: agent.signatureUrl,
            active: agent.active,
            hiredAt: agent.hiredAt,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
        },
        user: fullUser,
        profile: fullUser.profile,
        roles: fullUser.roles,
        activeRole: fullUser.activeRole,
        assignments: namedAssignments,
        availabilities,
        exceptions,
        preferences: { ...DEFAULT_PREFERENCES, ...agent.preferences },
        activities: await listActivities(userId, 0, 20),
    };
}
async function updateMyProfile(userId, data) {
    const [updated] = await connection_1.db
        .update(schema_identity_1.userProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId))
        .returning();
    if (!updated)
        throw new utils_1.NotFoundError("Profil introuvable");
    return updated;
}
async function updateMyPreferences(userId, patch) {
    const agent = await getAgentRow(userId);
    const merged = { ...DEFAULT_PREFERENCES, ...agent.preferences, ...patch };
    await connection_1.db.update(schema_identity_1.agents).set({ preferences: merged, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, agent.id));
    return merged;
}
async function updateMyPassword(userId, currentPassword, newPassword) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Utilisateur introuvable");
    const matches = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!matches)
        throw new utils_1.UnauthorizedError("Mot de passe actuel incorrect");
    const newHash = await bcryptjs_1.default.hash(newPassword, 10);
    await connection_1.db.update(schema_identity_1.users).set({ passwordHash: newHash, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
}
async function uploadSignature(userId, buffer, originalName, mimeType) {
    const agent = await getAgentRow(userId);
    const key = `signatures/${agent.id}/${crypto_1.default.randomUUID()}-${sanitizeFilename(originalName)}`;
    await (0, storage_1.uploadObject)(key, buffer, mimeType);
    if (agent.signatureStorageKey) {
        try {
            await (0, storage_1.deleteObject)(agent.signatureStorageKey);
        }
        catch {
        }
    }
    const [updated] = await connection_1.db
        .update(schema_identity_1.agents)
        .set({ signatureUrl: "/profile/signature", signatureStorageKey: key, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, agent.id))
        .returning();
    return { signatureUrl: updated.signatureUrl };
}
async function getSignatureFile(userId) {
    const agent = await getAgentRow(userId);
    if (!agent.signatureStorageKey)
        throw new utils_1.NotFoundError("Aucune signature enregistrée");
    const { buffer, contentType } = await (0, storage_1.getObject)(agent.signatureStorageKey);
    return { buffer, contentType: contentType ?? "application/octet-stream" };
}
async function deleteSignature(userId) {
    const agent = await getAgentRow(userId);
    if (agent.signatureStorageKey) {
        try {
            await (0, storage_1.deleteObject)(agent.signatureStorageKey);
        }
        catch {
        }
    }
    await connection_1.db.update(schema_identity_1.agents).set({ signatureUrl: null, signatureStorageKey: null, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, agent.id));
}
async function listActivities(userId, offset, limit) {
    return connection_1.db
        .select()
        .from(schema_identity_1.agentActivities)
        .where((0, drizzle_orm_1.eq)(schema_identity_1.agentActivities.agentUserId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_identity_1.agentActivities.createdAt))
        .limit(limit)
        .offset(offset);
}
async function recordActivity(agentUserId, action, targetType, targetLabel, targetId) {
    await connection_1.db.insert(schema_identity_1.agentActivities).values({ agentUserId, action, targetType, targetLabel, targetId });
}
//# sourceMappingURL=profile.service.js.map