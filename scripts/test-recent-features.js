
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111'; // Demo business

async function runTests() {
  console.log('🚀 Starting Comprehensive Feature Tests...\n');
  let failures = 0;

  // =================================================================
  // TEST 1: STORAGE (Migration 131)
  // =================================================================
  console.log('📦 Testing Storage (Platform Assets)...');
  try {
    const fileName = `test-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('platform-assets')
      .upload(fileName, 'Test content', { upsert: true });

    if (uploadError) throw uploadError;
    console.log('  ✅ Upload successful');

    const { error: deleteError } = await supabase.storage
      .from('platform-assets')
      .remove([fileName]);

    if (deleteError) throw deleteError;
    console.log('  ✅ Cleanup successful');
  } catch (err) {
    console.error('  ❌ Storage Test Failed:', err.message);
    failures++;
  }

  // =================================================================
  // TEST 2: CONTEXTUAL INTELLIGENCE (Migration 132)
  // =================================================================
  console.log('\n🧠 Testing Contextual Intelligence (Nudge Dismissals)...');
  try {
    // Check if table exists first to avoid crashing
    const { error: checkError } = await supabase.from('nudge_dismissals').select('id').limit(1);
    
    if (checkError && checkError.message.includes('Could not find the table')) {
        console.error('  ⚠️ SKIPPED: Table nudge_dismissals is MISSING from database (Migration 132 not applied).');
        failures++; // We still count this as a failure/issue
    } else {
        // Need a user ID first. Let's try to get one or use a placeholder if testing strictly schema
        // We'll fetch the first user from the business
        const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('business_id', BUSINESS_ID)
            .limit(1);
        
        if (!users || users.length === 0) {
            console.log('  ⚠️ No users found for demo business. Skipping nudge insert.');
        } else {
            const userId = users[0].id;
            const nudgeType = 'test_nudge';
            const contextKey = `test-${Date.now()}`;

            const { error: insertError } = await supabase
                .from('nudge_dismissals')
                .insert({
                    user_id: userId,
                    nudge_type: nudgeType,
                    context_key: contextKey
                });
            
            if (insertError) throw insertError;
            console.log('  ✅ Insert dismissal successful');

            // Verify uniqueness constraint (should fail)
            const { error: duplicateError } = await supabase
                .from('nudge_dismissals')
                .insert({
                    user_id: userId,
                    nudge_type: nudgeType,
                    context_key: contextKey
                });
            
            if (duplicateError) {
                console.log('  ✅ Constraint check successful (Duplicate prevented)');
            } else {
                console.error('  ❌ Constraint check failed (Duplicate allowed)');
                failures++;
            }

            // Cleanup
            await supabase.from('nudge_dismissals').delete().eq('context_key', contextKey);
        }
    }
  } catch (err) {
    console.error('  ❌ Nudge Test Failed:', err.message);
    failures++;
  }

  // =================================================================
  // TEST 3: SPOKE FOUNDATION (Migration 133)
  // =================================================================
  console.log('\n🎙️ Testing Spoke Foundation...');
  try {
    const testPhone = '+15550009999';
    
    // 3.1 Contractor Phone
    // Clean up first just in case
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
    console.log('  ✅ Contractor Phone created');

    // 3.2 Spoke Update
    const { data: updateData, error: updateError } = await supabase
        .from('spoke_updates')
        .insert({
            business_id: BUSINESS_ID,
            contractor_phone_id: phoneData.id,
            source: 'SMS', // Simulating SMS input
            raw_transcript: 'Job complete. Collected 150 cash.',
            status: 'PROCESSING'
        })
        .select()
        .single();
    
    if (updateError) throw updateError;
    console.log('  ✅ Spoke Update logged');

    // 3.3 Spoke Draft (Simulate a draft creation linked to update)
    const { error: draftError } = await supabase
        .from('spoke_drafts')
        .insert({
            spoke_update_id: updateData.id,
            business_id: BUSINESS_ID,
            candidate_jobs: [{ job_id: 'uuid-placeholder', score: 0.9 }]
        });
    
    if (draftError) throw draftError;
    console.log('  ✅ Spoke Draft created');

    // Cleanup Spoke Data
    await supabase.from('contractor_phones').delete().eq('id', phoneData.id); // Cascade should handle others
    console.log('  ✅ Spoke Cleanup successful');

  } catch (err) {
    console.error('  ❌ Spoke Test Failed:', err.message);
    failures++;
  }

  // =================================================================
  // TEST 4: CUSTOMER PORTAL AUTH (Regression)
  // =================================================================
  console.log('\n🔐 Testing Customer Portal Auth (Regression)...');
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
          console.log('  ✅ Login verification successful');
      } else {
          throw new Error('Password mismatch');
      }
  } catch (err) {
      console.error('  ❌ Auth Test Failed:', err.message);
      failures++;
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n----------------------------------------');
  if (failures === 0) {
      console.log('🎉 ALL SYSTEMS GO! All recent features passed testing.');
  } else {
      console.log(`⚠️ ISSUES DETECTED: ${failures} test(s) failed.`);
      process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Script Error:', err);
  process.exit(1);
});
