import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './connection';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // The migrations folder will be created in your project root by default
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection pool when done
    await pool.end();
  }
}

runMigrations();