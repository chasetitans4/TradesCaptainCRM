const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const EMAIL = 'admin@tradescaptain.com';
const PASSWORD = 'AdminPass123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log(`Verifying login for ${EMAIL}...`);

  // 1. Fetch user
  const { data: user, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', EMAIL)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return;
  }

  if (!user) {
    console.error('User not found');
    return;
  }

  console.log('User found:', {
    id: user.id,
    email: user.email,
    password_hash_prefix: user.password_hash.substring(0, 10),
    status: user.status
  });

  // 2. Compare password
  console.log('Comparing password...');
  const isMatch = await bcrypt.compare(PASSWORD, user.password_hash);
  
  console.log('Password match result:', isMatch);
  
  if (isMatch) {
      console.log('SUCCESS: Credentials are valid.');
  } else {
      console.log('FAILURE: Password does not match hash.');
  }
}

run();
