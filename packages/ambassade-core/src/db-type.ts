import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Chaque service (ambassade-api, communaute-api) garde son propre pool
 * pg/instance drizzle (même Postgres physique, schémas partagés) et le
 * passe en paramètre aux fonctions de ce package — pas de connexion propre
 * à @poramma/ambassade-core, pas d'appel HTTP inter-service.
 */
export type Db = NodePgDatabase;
