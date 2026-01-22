const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Verifying Database Schema...');

  // Get all tables
  const { data: tables, error } = await supabase
    .rpc('get_all_table_names'); // Try RPC first if exists, otherwise fallback to known tables check

  if (error) {
      // RPC might not exist, let's try querying a few known tables to see if they error out
      // or try to list tables via information_schema if we had direct access (which we don't via JS client usually, unless configured)
      // Actually, Supabase JS client doesn't expose information_schema directly easily without a function.
      // We will check for the existence of key tables by selecting 1 row.
      console.log('RPC get_all_table_names failed or not found, checking specific tables...');
      await checkSpecificTables();
  } else {
      console.log('Tables found:', tables);
  }
}

async function checkSpecificTables() {
    const tablesToCheck = [
        'businesses',
        'users',
        'customers',
        'jobs',
        'admin_users',
        'crm_accounts',
        'client_onboarding',
        'referral_programs',
        'job_photos',
        'customer_equipment',
        'checklist_templates',
        'service_agreements',
        'documents',
        'leads_captain_settings',
        'admin_activity_log',
        'crm_email_log',
        'founders_program',
        'agent_submissions',
        'technician_daily_metrics',
        'custom_field_definitions',
        'survey_responses',
        'job_checklists',
        'equipment_types',
        'job_equipment',
        'quickbooks_connections',
        'quickbooks_sync_map',
        'geocoded_addresses',
        'daily_routes',
        'sms_conversations',
        'sms_messages',
        'call_logs',
        'email_logs',
        'automation_events',
        'customer_reminder_events',
        'reminders',
        'business_users',
        'emergency_requests',
         'portal_activity_log',
         'customer_referrals',
         'maintenance_reminders',
         'warranty_claims',
         'customer_documents',
         'membership_benefits_used',
         'quote_comments',
         'customer_issue_reports',
         'profiles',
         'activity_log',
         'business_revenue_stats',
         'invoice_refunds',
         'quote_items',
         'invoice_items'
     ];

    const missing = [];
    const present = [];
    const errors = [];

    for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') { // undefined_table
                missing.push(table);
            } else {
                errors.push(`${table}: ${error.message}`);
                // If it's a permission error, it exists but we can't see it.
                // But we are using service_role key (implied by previous context, wait, the key in previous scripts was generic)
                // Let's check if the key I'm using is service role or anon. 
                // The key I used in previous scripts starts with eyJ... usually that's anon.
                // If it's anon, RLS might hide tables? No, 42P01 is strictly structure.
                // 42501 is permission denied.
            }
        } else {
            present.push(table);
        }
    }

    console.log('\n=== SCHEMA VERIFICATION REPORT ===');
    console.log(`Checked ${tablesToCheck.length} expected tables.`);
    
    if (present.length > 0) {
        console.log(`\n✅ PRESENT (${present.length}):`);
        console.log(present.join(', '));
    }

    if (missing.length > 0) {
        console.log(`\n❌ MISSING (${missing.length}):`);
        console.log(missing.join(', '));
    }

    if (errors.length > 0) {
        console.log(`\n⚠️ ERRORS (${errors.length}):`);
        errors.forEach(e => console.log(e));
    }

    // Deep check specific columns
    console.log('\n=== COLUMN VERIFICATION ===');
    
    // Check jobs table for assigned_user_id
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('assigned_user_id, metadata').limit(1);
    if (jobsError) {
        console.log('❌ jobs check failed:', jobsError.message);
    } else {
        console.log('✅ jobs.assigned_user_id exists');
        // Check if metadata is in the returned object keys (if row exists) or we trust the select didn't error
        // But select won't error if column doesn't exist? Wait, Supabase/PostgREST usually errors if column invalid.
        // Let's rely on the fact that if we select it and it doesn't error, it exists.
        console.log('✅ jobs.metadata exists');
    }

    // Check quotes table
    const { data: quotes, error: quotesError } = await supabase.from('quotes').select('discount_amount, customer_notes').limit(1);
    if (quotesError) {
         console.log('❌ quotes check failed (missing columns?):', quotesError.message);
    } else {
         console.log('✅ quotes.discount_amount and customer_notes exist');
    }

    // Check quote_items table
    const { data: quoteItems, error: quoteItemsError } = await supabase.from('quote_items').select('saved_service_id, is_taxable').limit(1);
    if (quoteItemsError) {
         console.log('❌ quote_items check failed:', quoteItemsError.message);
    } else {
         console.log('✅ quote_items.saved_service_id exists');
    }


    // Check referral_programs for terms_and_conditions
    console.log('Debugging referral_programs...');
    const { data: refsAll, error: refsAllError } = await supabase.from('referral_programs').select('*').limit(1);
    
    if (refsAllError) {
         console.log('❌ referral_programs select(*) failed:', refsAllError.message, refsAllError.code);
    } else {
         console.log('✅ referral_programs select(*) success. Keys:', refsAll.length > 0 ? Object.keys(refsAll[0]) : 'No rows');
         
         // If we have rows, check for the column
         if (refsAll.length > 0) {
             const keys = Object.keys(refsAll[0]);
             if (keys.includes('terms_and_conditions')) {
                 console.log('✅ terms_and_conditions found');
             } else if (keys.includes('terms_conditions')) {
                 console.log('⚠️ terms_conditions found (old name)');
             } else {
                 console.log('❌ neither terms_and_conditions nor terms_conditions found');
             }
         }
    }
}

run();
