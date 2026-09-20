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
exports.getSummary = getSummary;
exports.listAppointments = listAppointments;
exports.lookupTicket = lookupTicket;
exports.validateArrival = validateArrival;
exports.listWalkIns = listWalkIns;
exports.createWalkIn = createWalkIn;
exports.updateWalkIn = updateWalkIn;
exports.createDossier = createDossier;
exports.createUrgence = createUrgence;
exports.searchMembers = searchMembers;
const zod_1 = require("zod");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const svc = __importStar(require("./reception.service"));
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const appointmentsQueryDto = zod_1.z.object({
    date: zod_1.z.string().regex(dateRe).optional(),
    q: zod_1.z.string().max(100).optional(),
});
const lookupQueryDto = zod_1.z.object({ ticket: zod_1.z.string().trim().min(3).max(50) });
const walkInListQueryDto = zod_1.z.object({
    date: zod_1.z.string().regex(dateRe).optional(),
    status: zod_1.z.enum(["ACTIVE", ...svc.WALKIN_STATUSES]).optional(),
    q: zod_1.z.string().max(100).optional(),
});
const createWalkInDto = zod_1.z.object({
    visitorName: zod_1.z.string().trim().max(150).optional(),
    visitorPhone: zod_1.z.string().trim().max(30).nullable().optional(),
    userId: zod_1.z.string().uuid().nullable().optional(),
    subServiceId: zod_1.z.string().min(1).nullable().optional(),
    category: zod_1.z.enum(svc.WALKIN_CATEGORIES),
    subject: zod_1.z.string().trim().min(3, "Décrivez la demande en quelques mots").max(1000),
    notes: zod_1.z.string().trim().max(2000).nullable().optional(),
    priority: zod_1.z.enum(["NORMAL", "URGENT"]).optional(),
});
const updateWalkInDto = zod_1.z
    .object({
    status: zod_1.z.enum(svc.WALKIN_STATUSES).optional(),
    priority: zod_1.z.enum(["NORMAL", "URGENT"]).optional(),
    notes: zod_1.z.string().trim().max(2000).nullable().optional(),
    outcome: zod_1.z.string().trim().max(1000).nullable().optional(),
    subServiceId: zod_1.z.string().min(1).nullable().optional(),
    redirectedSubServiceId: zod_1.z.string().min(1).nullable().optional(),
})
    .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Aucune modification demandée" });
const visitorDto = zod_1.z.object({
    lastName: zod_1.z.string().trim().min(1, "Le nom est obligatoire").max(100),
    firstName: zod_1.z.string().trim().min(1, "Le prénom est obligatoire").max(100),
    phone: zod_1.z.string().trim().min(6, "Le téléphone est obligatoire").max(30),
    city: zod_1.z.string().trim().min(1, "La ville est obligatoire").max(100),
});
const createUrgenceDto = zod_1.z
    .object({
    subServiceId: zod_1.z.string().min(1, "Choisissez le service"),
    motif: zod_1.z.string().trim().min(3, "Indiquez le motif").max(500),
    urgenceJustification: zod_1.z.string().trim().min(3, "Justifiez l'urgence").max(1000),
    userId: zod_1.z.string().uuid().nullable().optional(),
    visitor: visitorDto.nullable().optional(),
})
    .refine((v) => !!v.userId !== !!v.visitor, { message: "Indiquez un membre OU l'identité de la personne", path: ["userId"] });
const membersQueryDto = zod_1.z.object({ q: zod_1.z.string().trim().min(2, "Saisissez au moins 2 caractères").max(100) });
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const actorOf = (req) => ({ userId: req.userId, roleName: req.roleName ?? null });
async function getSummary(_req, res) {
    res.json((0, dto_1.ok)(await svc.summary()));
}
async function listAppointments(req, res) {
    const parsed = appointmentsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await svc.listAppointments(parsed.data)));
}
async function lookupTicket(req, res) {
    const parsed = lookupQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Numéro de ticket invalide", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await svc.lookupTicket(parsed.data.ticket)));
}
async function validateArrival(req, res) {
    res.json((0, dto_1.ok)(await svc.validateArrival(req.params.id, actorOf(req)), undefined, "Arrivée validée : l'agent est prévenu."));
}
async function listWalkIns(req, res) {
    const parsed = walkInListQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await svc.listWalkIns(parsed.data)));
}
async function createWalkIn(req, res) {
    const parsed = createWalkInDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_1.ok)(await svc.createWalkIn(parsed.data, actorOf(req)), undefined, "Demande enregistrée."));
}
async function updateWalkIn(req, res) {
    const parsed = updateWalkInDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await svc.updateWalkIn(req.params.id, parsed.data, actorOf(req))));
}
async function createDossier(req, res) {
    res.status(201).json((0, dto_1.ok)(await svc.createDossierFromWalkIn(req.params.id, actorOf(req)), undefined, "Dossier créé et rattaché au membre."));
}
async function createUrgence(req, res) {
    const parsed = createUrgenceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_1.ok)(await svc.createUrgence(parsed.data, actorOf(req)), undefined, "Rendez-vous d'urgence créé : les agents du service sont prévenus."));
}
async function searchMembers(req, res) {
    const parsed = membersQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Recherche invalide", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await svc.searchMembers(parsed.data.q)));
}
//# sourceMappingURL=reception.controller.js.map