const https = require('https');

const SUPABASE_ACCESS_TOKEN = 'sbp_oauth_e8d0a5acdafe8f9cd4e16795a2dd61f0ca69547b';
const PROJECT_REF = 'xfbswxuoauroagbvcrxk';

async function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('Fetching project details...');
    const project = await makeRequest(`/v1/projects/${PROJECT_REF}`, 'GET');
    console.log('Project:', project);

    console.log('\nExecuting SQL to check profiles table...');
    const sql = `
      SELECT 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'profiles';
    `;
    
    const result = await makeRequest(
      `/v1/projects/${PROJECT_REF}/database/query`,
      'POST',
      { query: sql }
    );
    console.log('Result:', JSON.stringify(result, null, 2));

    console.log('\nChecking RLS policies for profiles...');
    const rlsSql = `
      SELECT * FROM pg_policies WHERE tablename = 'profiles';
    `;
    const rlsResult = await makeRequest(
      `/v1/projects/${PROJECT_REF}/database/query`,
      'POST',
      { query: rlsSql }
    );
    console.log('RLS Policies:', JSON.stringify(rlsResult, null, 2));

    console.log('\nChecking roles in profiles table...');
    const rolesSql = `
      SELECT role, count(*) FROM profiles GROUP BY role;
    `;
    const rolesResult = await makeRequest(
      `/v1/projects/${PROJECT_REF}/database/query`,
      'POST',
      { query: rolesSql }
    );
    console.log('Roles:', JSON.stringify(rolesResult, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
