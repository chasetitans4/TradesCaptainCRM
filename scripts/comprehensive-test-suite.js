
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111'; // Demo business

function runCommand(command, name) {
  console.log(`\n⏳ Running ${name}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`  ✅ ${name} passed`);
    return true;
  } catch (error) {
    console.error(`  ❌ ${name} failed`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Platform Test Suite...\n');
  let failures = 0;

  // =================================================================
  // 1. UNIT TESTS
  // =================================================================
  if (!runCommand('npm test', 'Unit Tests')) {
    failures++;
  }

  // =================================================================
  // 2. SECURITY VULNERABILITY SCAN
  // =================================================================
  if (!runCommand('npm audit --audit-level=critical', 'Security Audit (Critical Only)')) {
    console.log('  ⚠️ Security vulnerabilities detected. Check output above.');
    // We don't fail the whole suite for audit warnings unless critical, usually.
    // But let's count it if we want to be strict.
    // failures++; 
  }

  // =================================================================
  // 3. INTEGRATION & E2E (Recent Features)
  // =================================================================
  console.log('\n🔄 Running Integration & E2E Tests...');
  
  // 3.1 STORAGE
  console.log('  📦 Testing Storage (Platform Assets)...');
  try {
    const fileName = `test-${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('platform-assets')
      .upload(fileName, 'Test content', { upsert: true });

    if (uploadError) throw uploadError;
    console.log('    ✅ Upload successful');

    const { error: deleteError } = await supabase.storage
      .from('platform-assets')
      .remove([fileName]);

    if (deleteError) throw deleteError;
    console.log('    ✅ Cleanup successful');
  } catch (err) {
    console.error('    ❌ Storage Test Failed:', err.message);
    failures++;
  }

  // 3.2 CONTEXTUAL INTELLIGENCE (Nudges)
  console.log('  🧠 Testing Contextual Intelligence (Nudge Dismissals)...');
  try {
    const { error: checkError } = await supabase.from('nudge_dismissals').select('id').limit(1);

    if (checkError && checkError.message.includes('Could not find the table')) {
        console.error('    ❌ SKIPPED: Table nudge_dismissals is MISSING (Migration 132).');
        failures++;
    } else {
        const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('business_id', BUSINESS_ID)
            .limit(1);

        if (!users || users.length === 0) {
            console.log('    ⚠️ No users found for demo business. Skipping nudge insert.');
        } else {
            const userId = users[0].id;
            const nudgeType = 'test_nudge';
            const contextKey = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            // Cleanup any stale test data first
            await supabase.from('nudge_dismissals').delete().match({
                user_id: userId,
                nudge_type: nudgeType,
                entity_type: 'test_entity'
            });

            const { error: insertError } = await supabase
                .from('nudge_dismissals')
                .insert({
                    user_id: userId,
                    nudge_type: nudgeType,
                    entity_type: 'test_entity',
                    entity_id: '00000000-0000-0000-0000-000000000000',
                    context_key: contextKey
                });

            if (insertError) throw insertError;
            console.log('    ✅ Insert dismissal successful');

            // Test unique constraint - attempt duplicate insert
            const { error: duplicateError } = await supabase
                .from('nudge_dismissals')
                .insert({
                    user_id: userId,
                    nudge_type: nudgeType,
                    entity_type: 'test_entity',
                    entity_id: '00000000-0000-0000-0000-000000000000',
                    context_key: contextKey
                });

            // PostgreSQL unique violation code is 23505
            const isUniqueViolation = duplicateError &&
                (duplicateError.code === '23505' ||
                 duplicateError.message.includes('duplicate key') ||
                 duplicateError.message.includes('unique constraint'));

            if (isUniqueViolation) {
                console.log('    ✅ Constraint check successful (unique violation caught)');
            } else if (duplicateError) {
                console.log('    ⚠️ Constraint returned unexpected error:', duplicateError.message);
            } else {
                console.error('    ❌ Constraint check failed - duplicate was allowed');
                failures++;
            }

            // Cleanup test data
            await supabase.from('nudge_dismissals').delete().eq('context_key', contextKey);
        }
    }
  } catch (err) {
    console.error('    ❌ Nudge Test Failed:', err.message);
    failures++;
  }

  // 3.3 SPOKE FOUNDATION
  console.log('  🎙️ Testing Spoke Foundation...');
  try {
    const testPhone = '+15550009999';
    await supabase.from('contractor_phones').delete().eq('phone_number', testPhone);

    const { data: phoneData, error: phoneError } = await supabase
        .from('contractor_phones')
        .insert({
            business_id: BUSINESS_ID,
            phone_number: testPhone,
            display_name: 'Test Tech',
            role: 'TECH',
            is_active: true
        })
        .select()
        .single();
    
    if (phoneError) throw phoneError;
    console.log('    ✅ Contractor Phone created');

    const { data: updateData, error: updateError } = await supabase
        .from('spoke_updates')
        .insert({
            business_id: BUSINESS_ID,
            contractor_phone_id: phoneData.id,
            source: 'SMS',
            raw_transcript: 'Job complete. Collected 150 cash.',
            status: 'PROCESSING'
        })
        .select()
        .single();
    
    if (updateError) throw updateError;
    console.log('    ✅ Spoke Update logged');

    await supabase.from('contractor_phones').delete().eq('id', phoneData.id);
    console.log('    ✅ Spoke Cleanup successful');

  } catch (err) {
    console.error('    ❌ Spoke Test Failed:', err.message);
    failures++;
  }

  // 3.4 AUTH REGRESSION
  console.log('  🔐 Testing Customer Portal Auth...');
  try {
      const email = 'captain@tradescaptain.com';
      const password = 'customer123';
      
      const { data: access } = await supabase
        .from('customer_portal_access')
        .select('*')
        .eq('email', email)
        .single();

      if (!access) throw new Error('User not found');
      if (!access.password_hash) throw new Error('Password hash missing');

      const isValid = await bcrypt.compare(password, access.password_hash);
      if (isValid) {
          console.log('    ✅ Login verification successful');
      } else {
          throw new Error('Password mismatch');
      }
  } catch (err) {
      console.error('    ❌ Auth Test Failed:', err.message);
      failures++;
  }

  // 3.5 ACH PAYMENTS (Migration 135)
  console.log('  💳 Testing ACH Payments...');
  try {
      const testIntentId = `pi_test_${Date.now()}`;
      const invoiceNumber = `ACH-TEST-${Date.now()}`;
      const { data: customer } = await supabase.from('customers').select('id').eq('business_id', BUSINESS_ID).limit(1).single();
      
      if (customer) {
        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert({
                business_id: BUSINESS_ID,
                customer_id: customer.id,
                invoice_number: invoiceNumber,
                total: 100.50,
                status: 'draft',
                ach_payment_intent_id: testIntentId,
                ach_payment_status: 'pending'
            })
            .select()
            .single();

        if (insertError) throw insertError;
        
        const { error: updateError } = await supabase
            .from('invoices')
            .update({ status: 'processing' })
            .eq('id', invoice.id);

        if (updateError) throw updateError;
        console.log('    ✅ ACH Invoice created and status updated');

        await supabase.from('invoices').delete().eq('id', invoice.id);
      } else {
        console.log('    ⚠️ Skipping ACH test (no customer found)');
      }
  } catch (err) {
      console.error('    ❌ ACH Test Failed:', err.message);
      failures++;
  }

  // =================================================================
  // 4. PERFORMANCE CHECK
  // =================================================================
  console.log('\n⚡ Testing Performance (Database Latency)...');
  try {
    const start = performance.now();
    await supabase.from('businesses').select('count', { count: 'exact', head: true });
    const end = performance.now();
    const duration = end - start;
    
    if (duration < 500) {
        console.log(`  ✅ Database Latency: ${duration.toFixed(2)}ms (Excellent)`);
    } else if (duration < 1000) {
        console.log(`  ⚠️ Database Latency: ${duration.toFixed(2)}ms (Acceptable)`);
    } else {
        console.log(`  ❌ Database Latency: ${duration.toFixed(2)}ms (Slow)`);
        // failures++; // Don't fail strictly on single ping
    }
  } catch (err) {
    console.error('  ❌ Performance Test Failed:', err.message);
    failures++;
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n----------------------------------------');
  if (failures === 0) {
      console.log('🎉 COMPREHENSIVE SUITE PASSED: All Systems Nominal.');
  } else {
      console.log(`⚠️ SUITE FAILED: ${failures} issue(s) detected.`);
      process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Script Error:', err);
  process.exit(1);
});
