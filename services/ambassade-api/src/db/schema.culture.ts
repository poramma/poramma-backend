// Tables "culture_threads"/"culture_messages" vivent dans @poramma/ambassade-core
// (partagées avec communaute-api, côté membre). Ce fichier ne fait que les ré-exporter
// pour que drizzle-kit (migrations, gérées ici) les voie.
import { cultureSchema } from "@poramma/ambassade-core";

export const cultureThreads = cultureSchema.cultureThreads;
export const cultureMessages = cultureSchema.cultureMessages;
