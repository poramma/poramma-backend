"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocumentDto = void 0;
const zod_1 = require("zod");
const docType = zod_1.z.enum([
    "ID_CARD",
    "PASSPORT",
    "STUDENT_CERT",
    "CONSULAR_CARD",
    "STUDENT_CARD",
    "PHOTO",
    "PROOF_ADDRESS",
    "BIRTH_CERT",
    "NATIONALITY_CERT",
    "SCHOLARSHIP_PROOF",
    "OTHER",
]);
exports.uploadDocumentDto = zod_1.z.object({
    type: docType,
    demandeId: zod_1.z.string().nullable().optional(),
    requirementId: zod_1.z.string().nullable().optional(),
});
//# sourceMappingURL=documents.js.map