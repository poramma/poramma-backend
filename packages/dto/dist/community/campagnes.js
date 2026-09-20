"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactionTypeDto = exports.clickCampagneDto = exports.listCampagnesQueryDto = void 0;
const zod_1 = require("zod");
const campagneType = zod_1.z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]);
exports.listCampagnesQueryDto = zod_1.z.object({
    type: campagneType.optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional(),
    offset: zod_1.z.coerce.number().int().min(0).max(1000).optional(),
});
exports.clickCampagneDto = zod_1.z.object({
    targetId: zod_1.z.string().min(1).max(200),
});
exports.reactionTypeDto = zod_1.z.enum(["LIKE", "PARTICIPATE"]);
//# sourceMappingURL=campagnes.js.map