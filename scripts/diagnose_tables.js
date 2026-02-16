
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
  console.log('Diagnosing Tables...');
  
  const tablesToCheck = ['leads', 'jobs', 'invoices', 'businesses', 'customers'];
  
  for (const table of tablesToCheck) {
    console.log(`Checking table: ${table}...`);
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Error accessing ${table}:`, error.message, error.code);
    } else {
      console.log(`✅ Table ${table} exists. Access successful.`);
    }
  }

  // Check businesses schema specifically for is_active
  console.log('\nChecking businesses columns...');
  const { data: bizData, error: bizError } = await supabase.from('businesses').select('*').limit(1);
  if (bizError) {
     console.error('Error fetching businesses:', bizError);
  } else if (bizData && bizData.length > 0) {
     console.log('Business columns:', Object.keys(bizData[0]));
  } else {
     console.log('Business table empty, trying insert to check schema...');
     // We can't easily check columns if empty without inspection, but the previous error gave us a hint.
  }
}

diagnose().catch(console.error);
