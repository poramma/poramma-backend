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
exports.listServices = listServices;
exports.getService = getService;
exports.createService = createService;
exports.updateService = updateService;
exports.deleteService = deleteService;
exports.getServiceSubServices = getServiceSubServices;
exports.getSubService = getSubService;
exports.createSubService = createSubService;
exports.updateSubService = updateSubService;
exports.createSchedule = createSchedule;
exports.updateSchedule = updateSchedule;
exports.deleteSchedule = deleteSchedule;
exports.createException = createException;
exports.deleteException = deleteException;
exports.addRequirement = addRequirement;
exports.updateRequirement = updateRequirement;
exports.removeRequirement = removeRequirement;
const svc = __importStar(require("./services.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
function numOrNull(v) {
    if (v === null || v === undefined)
        return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}
function serializeSub(sub) {
    return { ...sub, basePrice: numOrNull(sub.basePrice) };
}
function serializeService(service) {
    return { ...service, subServices: (service.subServices ?? []).map(serializeSub) };
}
async function listServices(_req, res) {
    const services = await svc.listServices();
    res.json((0, dto_2.ok)(services.map(serializeService)));
}
async function getService(req, res) {
    res.json((0, dto_2.ok)(serializeService(await svc.getService(req.params.id))));
}
async function createService(req, res) {
    const parsed = dto_1.createServiceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(serializeService(await svc.createService(parsed.data))));
}
async function updateService(req, res) {
    const parsed = dto_1.updateServiceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(serializeService(await svc.updateService(req.params.id, parsed.data))));
}
async function deleteService(req, res) {
    await svc.deleteService(req.params.id);
    res.status(204).send();
}
async function getServiceSubServices(req, res) {
    const service = await svc.getService(req.params.id);
    res.json((0, dto_2.ok)(service.subServices.map(serializeSub)));
}
async function getSubService(req, res) {
    res.json((0, dto_2.ok)(serializeSub(await svc.getSubService(req.params.id))));
}
async function createSubService(req, res) {
    const parsed = dto_1.createSubServiceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const sub = await svc.createSubService(parsed.data);
    res.status(201).json((0, dto_2.ok)(serializeSub(sub)));
}
async function updateSubService(req, res) {
    const parsed = dto_1.updateSubServiceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(serializeSub(await svc.updateSubService(req.params.id, parsed.data))));
}
async function createSchedule(req, res) {
    const parsed = dto_1.createScheduleDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const schedule = await svc.createSchedule(req.params.id, parsed.data);
    res.status(201).json((0, dto_2.ok)(schedule));
}
async function updateSchedule(req, res) {
    const parsed = dto_1.updateScheduleDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateSchedule(req.params.id, parsed.data)));
}
async function deleteSchedule(req, res) {
    await svc.deleteSchedule(req.params.id);
    res.status(204).send();
}
async function createException(req, res) {
    const parsed = dto_1.createExceptionDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const callerUserId = req.userId;
    const exception = await svc.createException(req.params.id, parsed.data, callerUserId);
    res.status(201).json((0, dto_2.ok)(exception));
}
async function deleteException(req, res) {
    await svc.deleteException(req.params.id);
    res.status(204).send();
}
async function addRequirement(req, res) {
    const parsed = dto_1.createRequirementDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const requirement = await svc.addRequirement(req.params.id, parsed.data);
    res.status(201).json((0, dto_2.ok)(requirement));
}
async function updateRequirement(req, res) {
    const parsed = dto_1.updateRequirementDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateRequirement(req.params.id, parsed.data)));
}
async function removeRequirement(req, res) {
    await svc.removeRequirement(req.params.id);
    res.status(204).send();
}
//# sourceMappingURL=services.controller.js.map