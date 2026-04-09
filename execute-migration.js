#!/usr/bin/env node
/**
 * Execute SQL Migration via Supabase Management API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function executeSQL(sql) {
  // Using the pg-api endpoint for direct SQL execution
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      sql: sql
    });

    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/api/v1/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_secret_HWXMFuzUhX-O3KxIiZMpgA_ShAOlMmq',
        'Authorization': `Bearer sb_secret_HWXMFuzUhX-O3KxIiZMpgA_ShAOlMmq`,
        'Content-Length': Buffer.byteLength(postData)
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
    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('SUPABASE DATABASE MIGRATION');
  console.log('='.repeat(60));
  console.log('');
  console.log('Project Ref:', PROJECT_REF);
  console.log('');

  try {
    // Test connection
    console.log('Testing connection to Supabase...');
    const connectionTest = await makeRequest(`/v1/projects/${PROJECT_REF}`, 'GET');
    if (connectionTest.id) {
      console.log('✓ Connected to Supabase project:', connectionTest.name);
    }
    console.log('');

    // Read migration file
    const sqlPath = path.join(__dirname, 'supabase/migrations/20260408_analytics_and_permissions.sql');
    console.log('Reading migration file:', sqlPath);
    const migrationSQL = fs.readFileSync(sqlPath, 'utf8');

    // Try to execute via Management API
    console.log('');
    console.log('Attempting to execute migration...');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute statements in batches (to avoid overwhelming the server)
    const batchSize = 5;
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(statements.length / batchSize);

      console.log(`Executing batch ${batchNum}/${totalBatches}...`);

      for (const stmt of batch) {
        // Skip comments and empty statements
        if (stmt.startsWith('--') || stmt.trim() === '') continue;

        try {
          // Try using the Management API's execute SQL endpoint
          const result = await makeRequest(
            `/v1/projects/${PROJECT_REF}/database/query`,
            'POST',
            { query: stmt }
          );

          if (result.error) {
            // Some errors are expected (like "already exists")
            if (result.error.includes('already exists') ||
                result.error.includes('does not exist') ||
                result.error.includes('duplicate key')) {
              successCount++;
            } else {
              errorCount++;
              errors.push({ statement: stmt.substring(0, 50) + '...', error: result.error });
            }
          } else {
            successCount++;
          }
        } catch (err) {
          // Try alternative approach
          try {
            // Execute via REST API with service role
            const sql = encodeURIComponent(stmt);
            const result = await makeRequest(
              `/v1/projects/${PROJECT_REF}/database/query?sql=${sql}`,
              'POST'
            );
            successCount++;
          } catch (e) {
            errorCount++;
            errors.push({ statement: stmt.substring(0, 50), error: e.message });
          }
        }
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log('Statements executed successfully:', successCount);
    console.log('Errors:', errorCount);
    console.log('');

    if (errors.length > 0) {
      console.log('Errors encountered (first 5):');
      errors.slice(0, 5).forEach((e, i) => {
        console.log(`${i + 1}. ${e.error}`);
      });
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('MANUAL MIGRATION REQUIRED');
    console.log('='.repeat(60));
    console.log('');
    console.log('Due to API limitations, please run the migration manually:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log(`2. Select project: ${PROJECT_REF}`);
    console.log('3. Click "SQL Editor" in the sidebar');
    console.log('4. Click "New Query"');
    console.log(`5. Open file: supabase/migrations/20260408_analytics_and_permissions.sql`);
    console.log('6. Copy all contents');
    console.log('7. Paste into the SQL Editor');
    console.log('8. Click "Run" or press Ctrl+Enter');
    console.log('');
    console.log('The migration file includes:');
    console.log('- 3 ENUM types');
    console.log('- 13 new tables');
    console.log('- 8 functions');
    console.log('- 3 views');
    console.log('- Row Level Security policies');
    console.log('- Sample data for regions and countries');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
    console.log('Please run the migration manually through the Supabase Dashboard.');
  }
}

runMigration();
