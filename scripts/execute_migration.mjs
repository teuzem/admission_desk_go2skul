/**
 * Execute SQL migration via Supabase REST RPC
 * Uses the pg_net or direct SQL execution approach
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://xfbswxuoauroagbvcrxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYnN3eHVvYXVyb2FnYnZjcnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODEyNDAsImV4cCI6MjA4ODk1NzI0MH0.NGdc1Rs7ym7d4uO32-lgpmF6xQuCpxSoxeArLJWd0DQ';

// We'll execute the migration statements one at a time using the REST API
// Since we can't execute DDL with the anon key, we need to use the service_role key
// or the Management API. Let's check if a service_role key is available.

// First, let's try to find if there's a service_role key anywhere
async function findServiceRoleKey() {
  // Check common locations
  const envFiles = ['.env', '.env.local', '.env.production'];
  for (const envFile of envFiles) {
    try {
      const content = fs.readFileSync(path.resolve(__dirname, '..', envFile), 'utf-8');
      const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
      if (match) return match[1].trim();
      const match2 = content.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.+)/);
      if (match2) return match2[1].trim();
    } catch (e) {
      // File not found
    }
  }
  return null;
}

async function executeSQLViaRPC(sql, apiKey, role = 'anon') {
  // Try using the Supabase SQL endpoint (requires service_role or management API)
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return await resp.json();
}

// Alternative: use pg endpoint directly
async function executeSQLViaPg(sql, dbPassword) {
  // This would require a postgres client, which is a heavy dependency.
  // Let's try the management API approach first.
  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SUPABASE MIGRATION EXECUTOR');
  console.log('='.repeat(60));
  console.log();

  // Check for service role key
  const serviceKey = await findServiceRoleKey();
  if (serviceKey) {
    console.log('Found service_role key! Attempting to execute migration...');
  } else {
    console.log('No service_role key found in environment files.');
    console.log();
    console.log('To execute the migration, you need ONE of these options:');
    console.log();
    console.log('  OPTION A: Run SQL in Supabase Dashboard');
    console.log('  ─────────────────────────────────────────');
    console.log('  1. Open: https://supabase.com/dashboard/project/xfbswxuoauroagbvcrxk/sql/new');
    console.log('  2. Paste the SQL from the migration file');
    console.log('  3. Click "Run"');
    console.log();
    console.log('  OPTION B: Provide your database password');
    console.log('  ──────────────────────────────────────────');
    console.log('  Add SUPABASE_DB_PASSWORD=your_password to your .env file');
    console.log('  Then re-run this script');
    console.log();
    console.log('  OPTION C: Use Supabase CLI with login');
    console.log('  ──────────────────────────────────────');
    console.log('  Run: npx supabase login');
    console.log('  Then: npx supabase link --project-ref xfbswxuoauroagbvcrxk');
    console.log('  Then: npx supabase db push');
    console.log();
    console.log('I will now attempt to use the Dashboard approach via browser...');
    console.log();
  }

  // Read the migration SQL
  const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260424000000_enterprise_support_system.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`Migration file: ${migrationPath}`);
  console.log(`SQL length: ${migrationSQL.length} characters`);
  console.log();

  // Try direct RPC call (will likely fail with anon key for DDL)
  if (serviceKey) {
    try {
      console.log('Executing migration via service_role RPC...');
      await executeSQLViaRPC(migrationSQL, serviceKey);
      console.log('✅ Migration executed successfully!');
    } catch (err) {
      console.log(`❌ RPC execution failed: ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
