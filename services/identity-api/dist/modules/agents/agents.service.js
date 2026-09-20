"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAgents = listAgents;
exports.getAgent = getAgent;
exports.createAgent = createAgent;
exports.updateAgent = updateAgent;
exports.deleteAgent = deleteAgent;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const mailer_1 = require("@poramma/mailer");
const auth_service_1 = require("../auth/auth.service");
const audit_1 = require("../../shared/audit");
const cache_1 = require("@poramma/cache");
function generateTempPassword() {
    return crypto_1.default.randomBytes(9).toString("base64url");
}
async function toAgentShape(agentRow) {
    const user = await (0, auth_service_1.buildFullUser)(agentRow.userId);
    return {
        id: agentRow.id,
        userId: agentRow.userId,
        user,
        matricule: agentRow.matricule,
        roleTitle: agentRow.roleTitle,
        department: agentRow.department,
        officeNumber: agentRow.officeNumber,
        signatureUrl: agentRow.signatureUrl,
        active: agentRow.active,
        hiredAt: agentRow.hiredAt,
        createdAt: agentRow.createdAt,
        updatedAt: agentRow.updatedAt,
        assignments: [],
        availabilities: [],
    };
}
async function listAgents(filters) {
    const conditions = [];
    if (filters.department)
        conditions.push((0, drizzle_orm_1.eq)(schema_identity_1.agents.department, filters.department));
    const rows = await connection_1.db
        .select()
        .from(schema_identity_1.agents)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy(schema_identity_1.agents.createdAt);
    const shaped = await Promise.all(rows.map(toAgentShape));
    if (filters.search) {
        const q = filters.search.toLowerCase();
        return shaped.filter((a) => {
            const fullName = `${a.user.profile?.firstName ?? ""} ${a.user.profile?.lastName ?? ""}`.toLowerCase();
            return fullName.includes(q) || a.user.email.toLowerCase().includes(q) || a.matricule.toLowerCase().includes(q);
        });
    }
    return shaped;
}
async function getAgent(id) {
    const [row] = await connection_1.db.select().from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Agent introuvable");
    return toAgentShape(row);
}
async function createAgent(data, createdBy) {
    const [existingEmail] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, data.email));
    if (existingEmail)
        throw new utils_1.ConflictError("Email déjà utilisé");
    const [existingMatricule] = await connection_1.db.select().from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.matricule, data.matricule));
    if (existingMatricule)
        throw new utils_1.ConflictError("Matricule déjà utilisé");
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, data.roleId));
    if (!role)
        throw new utils_1.NotFoundError("Rôle introuvable");
    const tempPassword = data.password ?? generateTempPassword();
    const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
    const agentRow = await connection_1.db.transaction(async (tx) => {
        const [user] = await tx
            .insert(schema_identity_1.users)
            .values({
            email: data.email,
            phone: data.phone ?? null,
            passwordHash,
            status: "VERIFIED",
            emailVerified: true,
        })
            .returning();
        await tx.insert(schema_identity_1.userProfiles).values({
            userId: user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            userType: "other",
        });
        const [agent] = await tx
            .insert(schema_identity_1.agents)
            .values({
            userId: user.id,
            matricule: data.matricule,
            roleTitle: data.roleTitle ?? null,
            department: data.department,
            officeNumber: data.officeNumber ?? null,
            active: data.active ?? true,
            hiredAt: new Date(),
        })
            .returning();
        await tx.insert(schema_identity_1.userRoles).values({
            userId: user.id,
            roleId: data.roleId,
            assignedBy: createdBy,
            isActive: true,
        });
        return agent;
    });
    await (0, mailer_1.sendMail)({
        to: data.email,
        subject: "Votre compte Poramma a été créé",
        html: `
      <h2>Bienvenue sur Poramma</h2>
      <p>Un compte agent a été créé pour vous, avec le matricule <strong>${data.matricule}</strong>.</p>
      <p>Identifiant : ${data.email}</p>
      <p>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
      <p>Nous vous recommandons de le changer dès votre première connexion.</p>
    `,
    });
    await (0, audit_1.writeAudit)({
        action: "CREATE",
        entityType: "AGENT",
        entityId: agentRow.id,
        actor: { userId: createdBy, roleName: null },
        details: { matricule: data.matricule, department: data.department },
    });
    return toAgentShape(agentRow);
}
async function updateAgent(id, data) {
    const [existing] = await connection_1.db.select().from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Agent introuvable");
    if (data.email || data.phone !== undefined) {
        await connection_1.db
            .update(schema_identity_1.users)
            .set({
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, existing.userId));
    }
    if (data.firstName || data.lastName) {
        await connection_1.db
            .update(schema_identity_1.userProfiles)
            .set({
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, existing.userId));
    }
    const agentPatch = {};
    if (data.matricule)
        agentPatch.matricule = data.matricule;
    if (data.roleTitle !== undefined)
        agentPatch.roleTitle = data.roleTitle;
    if (data.department)
        agentPatch.department = data.department;
    if (data.officeNumber !== undefined)
        agentPatch.officeNumber = data.officeNumber;
    if (data.active !== undefined)
        agentPatch.active = data.active;
    agentPatch.updatedAt = new Date();
    const [updated] = await connection_1.db.update(schema_identity_1.agents).set(agentPatch).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, id)).returning();
    return toAgentShape(updated);
}
async function deleteAgent(id, callerUserId) {
    const [existing] = await connection_1.db.select().from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Agent introuvable");
    if (existing.userId === callerUserId) {
        throw new utils_1.ForbiddenError("Vous ne pouvez pas suspendre votre propre compte");
    }
    await connection_1.db.update(schema_identity_1.users).set({ status: "SUSPENDED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, existing.userId));
    await connection_1.db.update(schema_identity_1.agents).set({ active: false, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.id, id));
    const activeSessions = await connection_1.db
        .select({ id: schema_identity_1.sessions.id })
        .from(schema_identity_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, existing.userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
    await connection_1.db
        .update(schema_identity_1.sessions)
        .set({ revokedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, existing.userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
    await Promise.all(activeSessions.map((s) => (0, cache_1.revokeSession)(s.id)));
    await (0, audit_1.writeAudit)({
        action: "SUSPEND",
        entityType: "AGENT",
        entityId: id,
        actor: { userId: callerUserId, roleName: null },
        severity: "WARNING",
    });
}
//# sourceMappingURL=agents.service.js.map