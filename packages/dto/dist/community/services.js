"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityQueryDto = exports.listServicesQueryDto = void 0;
const zod_1 = require("zod");
exports.listServicesQueryDto = zod_1.z.object({
    q: zod_1.z.string().min(1).optional(),
});
exports.availabilityQueryDto = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
});
//# sourceMappingURL=services.js.map