"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMemberStatus = setMemberStatus;
exports.listTeam = listTeam;
exports.addTeamMember = addTeamMember;
exports.changeTeamRole = changeTeamRole;
exports.removeTeamMember = removeTeamMember;
const zod_1 = require("zod");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const svc = __importStar(require("./community-admin.service"));
const statusDto = zod_1.z.object({
    status: zod_1.z.enum(["SUSPENDED", "ACTIVE"]),
    reason: zod_1.z.string().trim().max(500).optional(),
});
const addDto = zod_1.z.object({ email: zod_1.z.string().trim().email("Email invalide").max(255), role: zod_1.z.enum(svc.TEAM_ROLES) });
const roleDto = zod_1.z.object({ role: zod_1.z.enum(svc.TEAM_ROLES) });
const idDto = zod_1.z.string().uuid("Identifiant invalide");
function parse(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", parsed.error.flatten().fieldErrors);
    return parsed.data;
}
const callerOf = (req) => ({ userId: req.userId, roleName: req.roleName ?? null });
const uaOf = (req) => (typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null);
async function setMemberStatus(req, res) {
    const id = parse(idDto, req.params.id);
    const body = parse(statusDto, req.body);
    const result = await svc.setMemberStatus(id, body.status, callerOf(req), body.reason ?? null, req.ip, uaOf(req));
    res.json((0, dto_1.ok)(result, undefined, body.status === "SUSPENDED" ? "Compte suspendu : toutes ses sessions sont fermées." : "Compte réactivé."));
}
async function listTeam(_req, res) {
    res.json((0, dto_1.ok)(await svc.listTeam()));
}
async function addTeamMember(req, res) {
    const body = parse(addDto, req.body);
    res.status(201).json((0, dto_1.ok)(await svc.addTeamMember(body.email, body.role, callerOf(req), req.ip, uaOf(req)), undefined, "Membre ajouté à l'équipe."));
}
async function changeTeamRole(req, res) {
    const body = parse(roleDto, req.body);
    res.json((0, dto_1.ok)(await svc.changeTeamRole(parse(idDto, req.params.userId), body.role, callerOf(req), req.ip, uaOf(req)), undefined, "Rôle modifié : la personne devra se reconnecter."));
}
async function removeTeamMember(req, res) {
    await svc.removeTeamMember(parse(idDto, req.params.userId), callerOf(req), req.ip, uaOf(req));
    res.json((0, dto_1.ok)(null, undefined, "Membre retiré de l'équipe."));
}
//# sourceMappingURL=community-admin.controller.js.map