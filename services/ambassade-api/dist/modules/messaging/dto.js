"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageDto = exports.updateThreadStatusDto = exports.addParticipantDto = exports.createThreadDto = exports.listThreadsQueryDto = void 0;
const zod_1 = require("zod");
exports.listThreadsQueryDto = zod_1.z.object({
    demandeId: zod_1.z.string().optional(),
});
exports.createThreadDto = zod_1.z.object({
    demandeId: zod_1.z.string().optional(),
    subject: zod_1.z.string().min(1),
    participantIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.addParticipantDto = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
});
exports.updateThreadStatusDto = zod_1.z.object({
    status: zod_1.z.enum(["OPEN", "CLOSED", "ESCALATED"]),
});
exports.sendMessageDto = zod_1.z.object({
    body: zod_1.z.string().min(1),
});
//# sourceMappingURL=dto.js.map