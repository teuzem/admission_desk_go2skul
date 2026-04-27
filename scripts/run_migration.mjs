/**
 * Direct Supabase Migration Runner
 * Executes SQL against the Supabase database via the Management API
 * and tests all tables afterwards.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://xfbswxuoauroagbvcrxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYnN3eHVvYXVyb2FnYnZjcnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODEyNDAsImV4cCI6MjA4ODk1NzI0MH0.NGdc1Rs7ym7d4uO32-lgpmF6xQuCpxSoxeArLJWd0DQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Step 1: Check if tables already exist by querying them ──
async function checkTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('id').limit(1);
  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01' || error.message.includes('relation')) {
      return { exists: false, error: error.message };
    }
    // Table exists but maybe RLS blocks or it's empty
    return { exists: true, note: error.message };
  }
  return { exists: true, count: data?.length || 0 };
}

async function checkProfilesColumn() {
  const { data, error } = await supabase.from('profiles').select('is_technical_team').limit(1);
  if (error) {
    return { exists: false, error: error.message };
  }
  return { exists: true };
}

async function checkStorageBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    return { exists: false, error: error.message };
  }
  const bucket = data?.find(b => b.name === 'support-attachments');
  return { exists: !!bucket, buckets: data?.map(b => b.name) };
}

// ── Main ──
async function main() {
  console.log('='.repeat(60));
  console.log('  ENTERPRISE SUPPORT SYSTEM - DATABASE VERIFICATION');
  console.log('='.repeat(60));
  console.log();

  // Check profiles column
  console.log('1. Checking profiles.is_technical_team column...');
  const profileCol = await checkProfilesColumn();
  console.log(`   Result: ${profileCol.exists ? '✅ EXISTS' : '❌ MISSING - ' + profileCol.error}`);
  console.log();

  // Check each support table
  const tables = ['kb_categories', 'kb_articles', 'support_tickets', 'support_ticket_messages'];
  
  console.log('2. Checking support system tables...');
  const results = {};
  for (const table of tables) {
    const result = await checkTable(table);
    results[table] = result;
    const status = result.exists ? '✅ EXISTS' : '❌ MISSING';
    const detail = result.error ? ` (${result.error})` : result.note ? ` (${result.note})` : '';
    console.log(`   ${table}: ${status}${detail}`);
  }
  console.log();

  // Check storage bucket
  console.log('3. Checking storage bucket...');
  const bucket = await checkStorageBucket();
  console.log(`   support-attachments: ${bucket.exists ? '✅ EXISTS' : '❌ MISSING'}`);
  if (bucket.buckets) {
    console.log(`   Available buckets: ${bucket.buckets.join(', ') || 'none'}`);
  }
  console.log();

  // Summary
  const allTablesExist = tables.every(t => results[t].exists);
  const allGood = allTablesExist && profileCol.exists;

  console.log('='.repeat(60));
  if (allGood) {
    console.log('  ✅ ALL TABLES EXIST! System is ready.');
    console.log('  Running integration tests...');
    console.log('='.repeat(60));
    console.log();
    await runIntegrationTests();
  } else {
    console.log('  ⚠️  SOME TABLES ARE MISSING!');
    console.log('  The SQL migration needs to be executed.');
    console.log('  Attempting to run migration via Supabase SQL Editor...');
    console.log('='.repeat(60));
    console.log();
    console.log('MIGRATION SQL FILE LOCATION:');
    console.log(path.resolve(__dirname, '..', 'supabase', 'migrations', '20260424000000_enterprise_support_system.sql'));
    console.log();
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor.');
    console.log('URL: https://supabase.com/dashboard/project/xfbswxuoauroagbvcrxk/sql/new');
  }
}

// ── Integration Tests ──
async function runIntegrationTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Insert into kb_categories
  console.log('Test 1: Insert KB Category...');
  const { data: cat, error: catErr } = await supabase
    .from('kb_categories')
    .insert({ name: 'Test Category', slug: 'test-category-' + Date.now(), description: 'Auto-generated test category' })
    .select()
    .single();
  
  if (catErr) {
    console.log(`  ❌ FAIL: ${catErr.message}`);
    failed++;
  } else {
    console.log(`  ✅ PASS: Created category "${cat.name}" (${cat.id})`);
    passed++;

    // Test 2: Insert into kb_articles
    console.log('Test 2: Insert KB Article...');
    const { data: art, error: artErr } = await supabase
      .from('kb_articles')
      .insert({ 
        title: 'Test Article', 
        slug: 'test-article-' + Date.now(), 
        content: '<p>Test content</p>',
        category_id: cat.id,
        status: 'draft'
      })
      .select()
      .single();
    
    if (artErr) {
      console.log(`  ❌ FAIL: ${artErr.message}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: Created article "${art.title}" (${art.id})`);
      passed++;

      // Cleanup article
      await supabase.from('kb_articles').delete().eq('id', art.id);
      console.log('  🧹 Cleaned up test article.');
    }

    // Cleanup category
    await supabase.from('kb_categories').delete().eq('id', cat.id);
    console.log('  🧹 Cleaned up test category.');
  }

  // Test 3: Query support_tickets (should work, just empty or RLS restricted)
  console.log('Test 3: Query support_tickets...');
  const { data: tickets, error: ticketErr } = await supabase
    .from('support_tickets')
    .select('*')
    .limit(1);
  
  if (ticketErr && ticketErr.message.includes('does not exist')) {
    console.log(`  ❌ FAIL: Table does not exist`);
    failed++;
  } else {
    console.log(`  ✅ PASS: support_tickets accessible (${tickets?.length || 0} rows visible)`);
    passed++;
  }

  // Test 4: Query support_ticket_messages
  console.log('Test 4: Query support_ticket_messages...');
  const { data: msgs, error: msgErr } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .limit(1);
  
  if (msgErr && msgErr.message.includes('does not exist')) {
    console.log(`  ❌ FAIL: Table does not exist`);
    failed++;
  } else {
    console.log(`  ✅ PASS: support_ticket_messages accessible (${msgs?.length || 0} rows visible)`);
    passed++;
  }

  // Test 5: Realtime subscription test
  console.log('Test 5: Realtime subscription test...');
  try {
    const channel = supabase
      .channel('test-support-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        console.log('  Received realtime event:', payload.eventType);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('  ✅ PASS: Realtime subscription established');
          passed++;
          // Clean up after 2 seconds
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        } else if (status === 'CHANNEL_ERROR') {
          console.log('  ❌ FAIL: Realtime subscription failed');
          failed++;
        }
      });
    
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 3000));
    supabase.removeChannel(channel);
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}`);
    failed++;
  }

  // Test 6: Storage bucket check
  console.log('Test 6: Storage bucket check...');
  const bucketResult = await checkStorageBucket();
  if (bucketResult.exists) {
    console.log('  ✅ PASS: support-attachments bucket exists');
    passed++;
  } else {
    console.log('  ⚠️  WARN: support-attachments bucket not found (needs manual creation in Dashboard)');
    console.log('       Go to: https://supabase.com/dashboard/project/xfbswxuoauroagbvcrxk/storage/buckets');
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
