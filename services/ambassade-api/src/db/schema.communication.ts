// Tables "communication" déplacées dans @poramma/ambassade-core (partagées avec
// communaute-api : fil d'annonces des citoyens, interactions, notifications).
// Ce fichier ne fait que ré-exporter pour ne pas casser les imports existants
// (`from "./schema.communication"`). Les migrations restent gérées ici
// (drizzle-kit lit ces exports).
import { campagnesSchema, notificationsSchema } from "@poramma/ambassade-core";

export const campagnes = campagnesSchema.campagnes;
export const campagneAttachments = campagnesSchema.campagneAttachments;
export const campagneDeliveries = campagnesSchema.campagneDeliveries;
export const campagneInteractions = campagnesSchema.campagneInteractions;
export const notifications = notificationsSchema.notifications;
