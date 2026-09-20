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
exports.listAgents = listAgents;
exports.getAgent = getAgent;
exports.createAgent = createAgent;
exports.updateAgent = updateAgent;
exports.deleteAgent = deleteAgent;
const agentsService = __importStar(require("./agents.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
async function listAgents(req, res) {
    const parsed = dto_1.listAgentsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const agents = await agentsService.listAgents({
        search: parsed.data.search,
        department: parsed.data.department,
    });
    res.json((0, dto_2.ok)(agents));
}
async function getAgent(req, res) {
    res.json((0, dto_2.ok)(await agentsService.getAgent(req.params.id)));
}
async function createAgent(req, res) {
    const parsed = dto_1.createAgentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const callerUserId = req.userId;
    const agent = await agentsService.createAgent(parsed.data, callerUserId);
    res.status(201).json((0, dto_2.ok)(agent));
}
async function updateAgent(req, res) {
    const parsed = dto_1.updateAgentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const agent = await agentsService.updateAgent(req.params.id, parsed.data);
    res.json((0, dto_2.ok)(agent));
}
async function deleteAgent(req, res) {
    const callerUserId = req.userId;
    await agentsService.deleteAgent(req.params.id, callerUserId);
    res.status(204).send();
}
//# sourceMappingURL=agents.controller.js.map