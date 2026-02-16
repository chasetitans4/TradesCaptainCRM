
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ';

const EMAIL = 'admin@tradescaptain.com';
const PASSWORD = 'AdminPass123!';

async function run() {
  console.log('--- DIAGNOSTIC: EXACT QUERY REPRODUCTION ---');
  
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log('\nLogging in...');
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });
  if (loginError) console.error('Login failed:', loginError.message);
  else console.log('Login successful.');

  // Reproduce: /leads?select=id&created_at=gte.2026-01-30...
  console.log('\nTesting exact query: leads?select=id&created_at=gte...');
  const { data, error, status } = await supabase
    .from('leads')
    .select('id')
    .gte('created_at', '2026-01-30T06:00:00.000Z');

  console.log(`Status: ${status}`);
  if (error) {
      console.log(`Error: ${error.message}`);
      console.log(`Details: ${error.details}`);
  } else {
      console.log(`Success. Rows: ${data.length}`);
  }
}

run().catch(console.error);
