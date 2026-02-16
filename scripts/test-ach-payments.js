/**
 * ACH Payments Test Script
 * Tests Migration 135: ACH payment columns on invoices table
 *
 * Tests:
 * 1. ACH columns exist (ach_payment_intent_id, ach_payment_status, amount)
 * 2. Status constraint includes 'processing' and 'failed'
 * 3. Index on ach_payment_intent_id works
 * 4. Full CRUD operations with ACH fields
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

async function runACHTests() {
  console.log('🏦 ACH Payments Test Suite (Migration 135)\n');
  console.log('='.repeat(50));

  let failures = 0;
  let testInvoiceId = null;

  try {
    // Get a customer for testing
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .limit(1)
      .single();

    if (customerError || !customer) {
      console.error('❌ No customer found for testing. Create a test customer first.');
      process.exit(1);
    }

    console.log(`✅ Found test customer: ${customer.id}\n`);

    // =========================================
    // TEST 1: Create invoice with ACH fields
    // =========================================
    console.log('📝 Test 1: Create invoice with ACH fields');
    const testIntentId = `pi_test_ach_${Date.now()}`;
    const invoiceNumber = `ACH-TEST-${Date.now()}`;

    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        business_id: BUSINESS_ID,
        customer_id: customer.id,
        invoice_number: invoiceNumber,
        total: 250.00,
        status: 'draft',
        ach_payment_intent_id: testIntentId,
        ach_payment_status: 'pending',
        amount: 250.00
      })
      .select()
      .single();

    if (createError) {
      console.error(`   ❌ FAILED: ${createError.message}`);
      failures++;
    } else {
      testInvoiceId = newInvoice.id;
      console.log(`   ✅ Invoice created with ACH fields`);
      console.log(`      - ID: ${newInvoice.id}`);
      console.log(`      - ACH Intent: ${newInvoice.ach_payment_intent_id}`);
      console.log(`      - ACH Status: ${newInvoice.ach_payment_status}`);
    }

    // =========================================
    // TEST 2: Update to 'processing' status
    // =========================================
    console.log('\n📝 Test 2: Update invoice to processing status');

    const { data: processingInvoice, error: processingError } = await supabase
      .from('invoices')
      .update({
        status: 'processing',
        ach_payment_status: 'processing'
      })
      .eq('id', testInvoiceId)
      .select()
      .single();

    if (processingError) {
      console.error(`   ❌ FAILED: ${processingError.message}`);
      failures++;
    } else {
      console.log(`   ✅ Status updated to 'processing'`);
      console.log(`      - Status: ${processingInvoice.status}`);
      console.log(`      - ACH Status: ${processingInvoice.ach_payment_status}`);
    }

    // =========================================
    // TEST 3: Test 'failed' status
    // =========================================
    console.log('\n📝 Test 3: Test failed status constraint');

    const { data: failedInvoice, error: failedError } = await supabase
      .from('invoices')
      .update({
        status: 'failed',
        ach_payment_status: 'failed'
      })
      .eq('id', testInvoiceId)
      .select()
      .single();

    if (failedError) {
      console.error(`   ❌ FAILED: ${failedError.message}`);
      failures++;
    } else {
      console.log(`   ✅ Status 'failed' accepted by constraint`);
    }

    // =========================================
    // TEST 4: Query by ACH payment intent ID
    // =========================================
    console.log('\n📝 Test 4: Query by ach_payment_intent_id (index test)');

    const startTime = performance.now();
    const { data: foundInvoice, error: queryError } = await supabase
      .from('invoices')
      .select('*')
      .eq('ach_payment_intent_id', testIntentId)
      .single();
    const queryTime = performance.now() - startTime;

    if (queryError) {
      console.error(`   ❌ FAILED: ${queryError.message}`);
      failures++;
    } else if (foundInvoice.id === testInvoiceId) {
      console.log(`   ✅ Invoice found by ACH intent ID`);
      console.log(`      - Query time: ${queryTime.toFixed(2)}ms`);
    } else {
      console.error(`   ❌ FAILED: Wrong invoice returned`);
      failures++;
    }

    // =========================================
    // TEST 5: Update to 'paid' with ACH succeeded
    // =========================================
    console.log('\n📝 Test 5: Complete ACH payment flow');

    const { data: paidInvoice, error: paidError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        ach_payment_status: 'succeeded',
        paid_at: new Date().toISOString(),
        payment_method: 'ACH'
      })
      .eq('id', testInvoiceId)
      .select()
      .single();

    if (paidError) {
      console.error(`   ❌ FAILED: ${paidError.message}`);
      failures++;
    } else {
      console.log(`   ✅ ACH payment completed successfully`);
      console.log(`      - Status: ${paidInvoice.status}`);
      console.log(`      - ACH Status: ${paidInvoice.ach_payment_status}`);
      console.log(`      - Payment Method: ${paidInvoice.payment_method}`);
    }

    // =========================================
    // TEST 6: Invalid status constraint check
    // =========================================
    console.log('\n📝 Test 6: Invalid status constraint check');

    const { error: invalidError } = await supabase
      .from('invoices')
      .update({ status: 'invalid_status' })
      .eq('id', testInvoiceId);

    if (invalidError) {
      console.log(`   ✅ Constraint rejected invalid status`);
      console.log(`      - Error: ${invalidError.message.substring(0, 60)}...`);
    } else {
      console.error(`   ❌ FAILED: Invalid status was accepted`);
      failures++;
    }

    // =========================================
    // CLEANUP
    // =========================================
    console.log('\n🧹 Cleaning up test data...');

    if (testInvoiceId) {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', testInvoiceId);

      if (deleteError) {
        console.error(`   ⚠️ Cleanup warning: ${deleteError.message}`);
      } else {
        console.log('   ✅ Test invoice deleted');
      }
    }

  } catch (err) {
    console.error(`\n💥 Unexpected error: ${err.message}`);
    failures++;
  }

  // =========================================
  // SUMMARY
  // =========================================
  console.log('\n' + '='.repeat(50));
  if (failures === 0) {
    console.log('🎉 ACH PAYMENTS TEST SUITE PASSED');
    console.log('   All Migration 135 features verified.');
  } else {
    console.log(`⚠️ ACH PAYMENTS TEST SUITE: ${failures} failure(s)`);
    process.exit(1);
  }
}

runACHTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
