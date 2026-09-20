// Table "audit_logs" déplacée dans @poramma/ambassade-core (partagée avec
// communaute-api, qui doit aussi auditer les mutations côté citoyen — voir
// RÈGLE-08). Ce fichier ne fait que ré-exporter pour ne pas casser les
// imports existants (`from "./schema.audit"`) dans ce service.
import { auditSchema } from "@poramma/ambassade-core";

export const audit = auditSchema.audit;
export const auditLogs = auditSchema.auditLogs;
