
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ';

const EMAIL = 'admin@tradescaptain.com';
const PASSWORD = 'AdminPass123!';

async function run() {
  console.log('--- DIAGNOSTIC: BROWSER SIMULATION ---');
  
  // 1. Init Client with ANON KEY
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  // 2. Try Unauthenticated Access
  console.log('\n2. Testing Unauthenticated Access to "leads"...');
  const { error: unauthError, status: unauthStatus } = await supabase.from('leads').select('id').limit(1);
  console.log(`Status: ${unauthStatus}`);
  if (unauthError) console.log(`Error: ${unauthError.message}`);

  // 3. Login
  console.log('\n3. Logging in...');
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (loginError) {
    console.error('Login failed:', loginError.message);
    return;
  }
  console.log('Login successful.');

  // 4. Try Authenticated Access
  console.log('\n4. Testing Authenticated Access to "leads"...');
  const { error: authError, status: authStatus } = await supabase.from('leads').select('id').limit(1);
  console.log(`Status: ${authStatus}`);
  if (authError) {
      console.log(`Error: ${authError.message}`);
      console.log(`Details: ${authError.details}`);
      console.log(`Hint: ${authError.hint}`);
  } else {
      console.log('Success! Table is accessible.');
  }

  // 5. Check businesses table schema via Rpc or select
  // We can't check schema easily with Anon key usually, but let's try to select *
  console.log('\n5. Testing Access to "businesses"...');
  const { data: bizData, error: bizError, status: bizStatus } = await supabase.from('businesses').select('*').limit(1);
  console.log(`Status: ${bizStatus}`);
  if (bizError) {
      console.log(`Error: ${bizError.message}`);
  } else if (bizData && bizData.length > 0) {
      const hasIsActive = 'is_active' in bizData[0];
      console.log(`Column 'is_active' exists: ${hasIsActive}`);
  }
}

run().catch(console.error);
