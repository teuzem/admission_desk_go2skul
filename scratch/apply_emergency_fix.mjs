import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://xfbswxuoauroagbvcrxk.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_HWXMFuzUhX-O3KxIiZMpgA_ShAOlMmq';

async function executeSQL(sql) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    // Try alternative RPC names if exec_sql fails
    if (resp.status === 404) {
       return await tryAlternativeRPCs(sql);
    }
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return await resp.json();
}

async function tryAlternativeRPCs(sql) {
  const rpcs = ['pg_execute_sql', 'execute_sql', 'run_sql'];
  for (const rpc of rpcs) {
    console.log(`Trying RPC: ${rpc}...`);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });
    if (resp.ok) {
      console.log(`✅ Success with ${rpc}!`);
      return await resp.json();
    }
  }
  throw new Error('No compatible SQL execution RPC found. Please run the SQL manually in the Dashboard.');
}

async function main() {
  const sqlPath = path.resolve(__dirname, '..', 'supabase', 'migrations', 'emergency_fix.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  console.log('Applying emergency database fix...');
  try {
    const result = await executeSQL(sql);
    console.log('Result:', result);
    console.log('✅ Emergency fix applied successfully!');
  } catch (err) {
    console.error('❌ Failed to apply fix:', err.message);
    
    // If RPC fails, we might need to try the Management API approach
    console.log('Attempting Management API approach...');
    await tryManagementAPI(sql);
  }
}

async function tryManagementAPI(sql) {
    const PROJECT_REF = 'xfbswxuoauroagbvcrxk';
    const OAUTH_TOKEN = 'sbp_oauth_e8d0a5acdafe8f9cd4e16795a2dd61f0ca69547b';
    
    const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OAUTH_TOKEN}`
        },
        body: JSON.stringify({ query: sql })
    });
    
    if (resp.ok) {
        console.log('✅ Success via Management API!');
        const data = await resp.json();
        console.log('Result:', data);
    } else {
        const text = await resp.text();
        console.error(`❌ Management API also failed: HTTP ${resp.status}: ${text}`);
    }
}

main().catch(console.error);
