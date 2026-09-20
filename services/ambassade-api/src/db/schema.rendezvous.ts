// Tables "rendez-vous" déplacées dans @poramma/ambassade-core (partagées avec
// communaute-api). Ce fichier ne fait que ré-exporter pour ne pas casser les
// imports existants (`from "./schema.rendezvous"`). Les migrations restent
// gérées ici (drizzle-kit lit ces exports).
import { rendezvousSchema } from "@poramma/ambassade-core";

export const agentServiceAssignments = rendezvousSchema.agentServiceAssignments;
export const agentAvailabilities = rendezvousSchema.agentAvailabilities;
export const agentExceptions = rendezvousSchema.agentExceptions;
export const rendezVous = rendezvousSchema.rendezVous;
export const rendezVousNotes = rendezvousSchema.rendezVousNotes;
export const dailySchedulePrints = rendezvousSchema.dailySchedulePrints;
