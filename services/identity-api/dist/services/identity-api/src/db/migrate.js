"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const connection_1 = require("./connection");
async function runMigrations() {
    try {
        console.log('Running migrations...');
        await (0, migrator_1.migrate)(connection_1.db, { migrationsFolder: './migrations' });
        console.log('Migrations completed successfully');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await connection_1.pool.end();
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map