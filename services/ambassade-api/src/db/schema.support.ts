// Tables "support_tickets"/"support_ticket_messages" vivent dans @poramma/ambassade-core
// (partagées avec communaute-api, côté usager). Ce fichier ne fait que les ré-exporter
// pour que drizzle-kit (migrations, gérées ici) les voie.
import { supportSchema } from "@poramma/ambassade-core";

export const supportTickets = supportSchema.supportTickets;
export const supportTicketMessages = supportSchema.supportTicketMessages;
