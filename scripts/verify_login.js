const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
// Using ANON KEY here, not Service Role
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ';

const EMAIL = 'admin@tradescaptain.com';
const PASSWORD = 'password123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyLogin() {
  console.log(`Attempting login for ${EMAIL}...`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (error) {
    console.error('Login failed:', error);
  } else {
    console.log('Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Role:', data.user.role);
  }
}

verifyLogin();
