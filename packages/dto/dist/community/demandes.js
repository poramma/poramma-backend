"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommentDto = exports.createDemandeDto = void 0;
const zod_1 = require("zod");
exports.createDemandeDto = zod_1.z.object({
    subServiceId: zod_1.z.string().min(1),
    customPayload: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
    documents: zod_1.z
        .array(zod_1.z.object({
        requirementId: zod_1.z.string().min(1).nullable().optional(),
        documentId: zod_1.z.string().min(1),
    }))
        .max(30)
        .optional(),
});
exports.addCommentDto = zod_1.z.object({
    content: zod_1.z.string().min(1).max(2000),
});
//# sourceMappingURL=demandes.js.map