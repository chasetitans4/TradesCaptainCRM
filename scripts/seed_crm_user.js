
const { createClient } = require('@supabase/supabase-js');

// Configuration from seed_portal_data.js
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const USER_EMAIL = 'admin@tradescaptain.com';
const USER_PASSWORD = 'AdminPass123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Seeding Business CRM User...');

  // 1. Ensure Business Exists
  console.log('1. Ensuring Business...');
  const { error: businessError } = await supabase
    .from('businesses')
    .upsert({
      id: BUSINESS_ID,
      name: 'Trades Captain',
      owner_name: 'Captain Admin',
      email: 'contact@tradescaptain.com',
      phone: '+15550001111',
      plan_tier: 'pro', // Changed from 'gold' to satisfy check constraint
      is_active: true
    });

  if (businessError) {
    console.error('Error creating business:', businessError);
    // Don't exit, might already exist
  }

  // 2. Create Auth User
  console.log('2. Creating Auth User...');
  let authUserId;

  // Check if user exists first
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const existingUser = users.find(u => u.email === USER_EMAIL);

  if (existingUser) {
    console.log('Auth user already exists:', existingUser.id);
    authUserId = existingUser.id;
    
    // Force delete and recreate to ensure clean state
    await supabase.auth.admin.deleteUser(authUserId);
    console.log('Deleted existing user to force refresh');
  }

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: USER_EMAIL,
    password: USER_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Captain Admin' }
  });

  if (createError) {
    console.error('Error creating auth user:', createError);
    process.exit(1);
  }
  authUserId = newUser.user.id;
  console.log('Auth user created:', authUserId);

  // 3. Create Public User Profile
  console.log('3. Creating Public User Profile...');
  
  // Check if profile exists by auth_user_id
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (existingProfile) {
    console.log('Public profile already exists:', existingProfile.id);
    
    // Update role just in case
    await supabase.from('users').update({
        role: 'owner',
        business_id: BUSINESS_ID,
        name: 'Captain Admin',
        email: USER_EMAIL,
        auth_user_id: authUserId // Link to new auth user
    }).eq('id', existingProfile.id);

  } else {
    // Check if email exists on another profile but unlinked
    const { data: profileByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', USER_EMAIL)
        .single();

    if (profileByEmail) {
        console.log('Profile found by email, linking to new auth user...');
        await supabase.from('users').update({
            auth_user_id: authUserId,
            role: 'owner',
            business_id: BUSINESS_ID
        }).eq('id', profileByEmail.id);
    } else {
        const { data: newProfile, error: profileError } = await supabase
        .from('users')
        .insert({
            auth_user_id: authUserId,
            business_id: BUSINESS_ID,
            email: USER_EMAIL,
            name: 'Captain Admin',
            role: 'owner',
            status: 'active',
            phone: '+15559990000'
        })
        .select()
        .single();

        if (profileError) {
            console.error('Error creating public profile:', profileError);
        } else {
            console.log('Public profile created:', newProfile.id);
        }
    }
  }

  console.log('Done!');
  console.log('-----------------------------------');
  console.log(`Login: ${USER_EMAIL}`);
  console.log(`Password: ${USER_PASSWORD}`);
  console.log('-----------------------------------');
}

run().catch(console.error);
