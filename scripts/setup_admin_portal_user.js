const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const EMAIL = 'admin@tradescaptain.com';
const PASSWORD = 'admin123';
const SALT_ROUNDS = 10;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log(`Setting up Admin Portal user ${EMAIL}...`);

  // 1. Hash the password
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  console.log('Password hashed.');

  // 2. Check if admin user exists
  const { data: existingAdmin, error: findError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', EMAIL)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error('Error finding admin user:', findError);
    process.exit(1);
  }

  if (existingAdmin) {
    console.log('Admin user exists. Updating password...');
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        password_hash: passwordHash,
        status: 'active', // Ensure active
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAdmin.id);

    if (updateError) {
      console.error('Error updating admin user:', updateError);
      process.exit(1);
    }
    console.log('Admin user updated successfully.');
  } else {
    console.log('Admin user does not exist. Creating...');
    const { error: insertError } = await supabase
      .from('admin_users')
      .insert({
        email: EMAIL,
        full_name: 'Super Admin',
        role: 'admin',
        password_hash: passwordHash,
        status: 'active'
      });

    if (insertError) {
      console.error('Error creating admin user:', insertError);
      process.exit(1);
    }
    console.log('Admin user created successfully.');
  }
}

run().catch(console.error);
