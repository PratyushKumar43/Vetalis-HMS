import fs from 'fs';
import path from 'path';
import pg from 'pg';

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260812000000_init_schema.sql');
const projectRef = process.env.SUPABASE_PROJECT_REF || "your-project-ref";
const dbUrl = process.env.DATABASE_URL || (process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_PROJECT_REF ? `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${process.env.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres` : null);

async function run() {
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found at:', migrationPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  if (!dbUrl) {
    console.log('\n======================================================');
    console.log('SUPABASE DATABASE MIGRATION SCRIPT');
    console.log('======================================================');
    console.log('To apply the database migration:');
    console.log('\nOPTION 1: Run via DATABASE_URL or password parameter:');
    console.log('  DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" node scripts/apply-migration.mjs');
    console.log('\nOPTION 2: Run directly in Supabase SQL Editor:');
    console.log('  1. Open: https://supabase.com/dashboard/project/[PROJECT-REF]/sql/new');
    console.log('  2. Copy and paste the contents of: supabase/migrations/20260812000000_init_schema.sql');
    console.log('  3. Click "Run"');
    console.log('======================================================\n');
    return;
  }

  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Executing migration script...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
