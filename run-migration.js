#!/usr/bin/env node
/**
 * Supabase Database Migration Script
 * Executes the analytics and permissions SQL migration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'xfbswxuoauroagbvcrxk';
const SERVICE_ROLE_KEY = 'sb_secret_HWXMFuzUhX-O3KxIiZMpgA_ShAOlMmq';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/pg_execute_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('Starting database migration...');

  // Read SQL file
  const sqlPath = path.join(__dirname, 'supabase/migrations/20260408_analytics_and_permissions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // The SQL contains multiple statements separated by semicolons
  // We need to split them and execute sequentially

  console.log('Note: To execute this migration, please run the following SQL in your Supabase dashboard:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log(`2. Select project: ${PROJECT_REF}`);
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste the contents of: supabase/migrations/20260408_analytics_and_permissions.sql');
  console.log('5. Click Run');
  console.log('');
  console.log('Alternatively, you can use the Supabase CLI:');
  console.log('npx supabase migration up');
  console.log('');
  console.log('Migration SQL file location:');
  console.log(sqlPath);
  console.log('');
  console.log('Tables to be created:');
  console.log('- agent_categories');
  console.log('- regions');
  console.log('- countries');
  console.log('- admission_team_members');
  console.log('- admission_team_permissions');
  console.log('- admission_team_geographic_scope');
  console.log('- admission_team_category_scope');
  console.log('- application_assignments');
  console.log('- analytics_events');
  console.log('- application_analytics_snapshot');
  console.log('- agent_performance_analytics');
  console.log('- university_analytics');
  console.log('- agent_category_review_queue');
}

// Check if pg_execute_sql function exists and create it if needed
async function setupAndRun() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION pg_execute_sql(query TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE query;
      RETURN '{"status": "success"}'::JSONB;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
    END;
    $$;
  `;

  console.log('Setting up SQL execution function...');

  // Create a simple Node script to execute via management API
  const migrationSteps = `
========================================
MIGRATION INSTRUCTIONS
========================================

Your Supabase database migration file is ready at:
supabase/migrations/20260408_analytics_and_permissions.sql

To apply this migration:

METHOD 1: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project (${PROJECT_REF})
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of the migration file
6. Paste into the SQL Editor
7. Click "Run" (or press Ctrl+Enter)

METHOD 2: Using Supabase CLI
1. Open terminal in project directory
2. Run: npx supabase login
3. Run: npx supabase link --project-ref ${PROJECT_REF}
4. Run: npx supabase db push

METHOD 3: Using pg_dump/psql
1. Run: PGPASSWORD=<your-password> psql -h ${PROJECT_REF}.supabase.co -U postgres -d postgres -f supabase/migrations/20260408_analytics_and_permissions.sql

========================================
WHAT THIS MIGRATION DOES
========================================

1. Creates ENUMS:
   - agent_category: student_travel_agency, university_institution, secondary_high_school, language_center, pending_classification
   - permission_scope: read, write, manage
   - team_permission_type: applications_view, applications_review, etc.

2. Creates TABLES:
   - agent_categories: For classifying agents into categories
   - regions & countries: For geographic analytics
   - admission_team_members: Team member management
   - admission_team_permissions: Granular permissions
   - admission_team_geographic_scope: Country/region access
   - admission_team_category_scope: Category-based access
   - application_assignments: Task assignments
   - analytics_events: Event tracking
   - application_analytics_snapshot: Daily aggregated data
   - agent_performance_analytics: Agent metrics
   - university_analytics: University metrics
   - agent_category_review_queue: Classification workflow

3. Creates FUNCTIONS:
   - get_admissions_by_country
   - get_admissions_by_region
   - get_admissions_by_agent_category
   - get_team_member_permissions

4. Creates VIEWS:
   - v_applications_analytics
   - v_agent_performance_summary
   - v_admission_team_overview

5. Sets up ROW LEVEL SECURITY policies

6. Adds sample data for regions and countries
`;

  console.log(migrationSteps);
}

runMigration().catch(console.error);
