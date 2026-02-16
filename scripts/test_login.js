const { createClient } = require('@supabase/supabase-js');

// Config from .env
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = 'admin@tradescaptain.com';
const password = 'AdminPass123!';

async function testLogin() {
  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('LOGIN FAILED:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('LOGIN SUCCESSFUL!');
    console.log('User ID:', data.user.id);
    console.log('Session expires at:', new Date(data.session.expires_at * 1000).toLocaleString());
  }
}

testLogin();
