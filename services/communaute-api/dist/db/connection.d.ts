import { Pool } from "pg";
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<Record<string, never>> & {
    $client: Pool;
};
export default db;
//# sourceMappingURL=connection.d.ts.map