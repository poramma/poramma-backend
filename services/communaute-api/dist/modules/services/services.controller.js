"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listServices = listServices;
exports.getService = getService;
exports.getServiceSubServices = getServiceSubServices;
exports.getSubService = getSubService;
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const connection_1 = require("../../db/connection");
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
async function listServices(req, res) {
    const parsed = dto_1.communityServicesDto.listServicesQueryDto.safeParse(req.query);
    if (!parsed.success)
        return res.status(422).json({ success: false, error: zodDetails(parsed.error) });
    const all = await ambassade_core_1.servicesLogic.listServices(connection_1.db);
    const activeOnly = all.filter((s) => s.active && !s.isCultural);
    const q = parsed.data.q?.toLowerCase();
    const filtered = q ? activeOnly.filter((s) => s.name.toLowerCase().includes(q)) : activeOnly;
    res.json((0, dto_1.ok)(filtered.map(serializeService)));
}
async function getService(req, res) {
    const service = await ambassade_core_1.servicesLogic.getService(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(serializeService(service)));
}
async function getServiceSubServices(req, res) {
    const service = await ambassade_core_1.servicesLogic.getService(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)((service.subServices ?? []).filter((s) => s.active).map(serializeSub)));
}
async function getSubService(req, res) {
    const sub = await ambassade_core_1.servicesLogic.getSubService(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(serializeSub(sub)));
}
//# sourceMappingURL=services.controller.js.map