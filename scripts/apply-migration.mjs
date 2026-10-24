import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Helper to load .env / .env.local
function loadEnv() {
  const root = process.cwd();
  ['.env', '.env.local'].forEach((file) => {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          value = value.replace(/^['"]|['"]$/g, '').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  });
}

loadEnv();

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const dbUrl = process.env.DATABASE_URL || 
  (process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_PROJECT_REF 
    ? `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${process.env.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres` 
    : null);

async function run() {
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found at:', migrationsDir);
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('\n======================================================');
  console.log('SUPABASE DATABASE MIGRATION RUNNER');
  console.log('======================================================');
  console.log(`Found ${migrationFiles.length} migration(s):`, migrationFiles);

  if (!dbUrl) {
    console.log('\n⚠️  DATABASE_URL is not set.');
    console.log('To apply the latest migration directly:');
    console.log('  OPTION 1: Set DATABASE_URL and run:');
    console.log('    DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" node scripts/apply-migration.mjs');
    console.log('\n  OPTION 2: Run directly in the Supabase SQL Editor:');
    console.log('    1. Open Supabase Dashboard > SQL Editor');
    console.log('    2. Copy and run contents of: supabase/migrations/20261013010000_rbac_and_storage_security.sql');
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
    console.log('Connected!');

    for (const file of migrationFiles) {
      console.log(`\nExecuting migration: ${file}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sqlContent);
      console.log(`✅ Applied: ${file}`);
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
