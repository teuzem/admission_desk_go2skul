const https = require('https');

const PROJECT_REF = 'xfbswxuoauroagbvcrxk';
const SERVICE_ROLE_KEY = 'sb_secret_HWXMFuzUhX-O3KxIiZMpgA_ShAOlMmq';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: sql // The endpoint might expect 'query' or 'sql' depending on version
    });

    // Try the management API endpoint first with the service key
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/execute_sql', // This is a common pattern for custom RPCs
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    // Wait, the execute-migration.js used /api/v1/query on the supabase.co host
    // Let's try that exact one.
    const options2 = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/api/v1/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options2, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function run() {
  try {
    console.log('Checking roles in profiles table...');
    const rolesSql = `SELECT role, count(*) FROM profiles GROUP BY role;`;
    const rolesResult = await executeSQL(rolesSql);
    console.log('Roles Count:', JSON.stringify(rolesResult, null, 2));

    console.log('\nChecking RLS policies...');
    const rlsSql = `SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';`;
    const rlsResult = await executeSQL(rlsSql);
    console.log('RLS Policies:', JSON.stringify(rlsResult, null, 2));

    console.log('\nChecking if profiles table exists...');
    const tablesSql = `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`;
    const tablesResult = await executeSQL(tablesSql);
    console.log('Tables:', JSON.stringify(tablesResult, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
