const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const EMAIL = 'owner@tradescaptain.com';
const PASSWORD = 'OwnerPass123!';
const NAME = 'Business Owner';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log(`Setting up CRM User ${EMAIL}...`);

  // 1. Ensure Business Exists
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', BUSINESS_ID)
    .single();

  if (!business) {
    console.log('Creating test business...');
    await supabase.from('businesses').insert({
      id: BUSINESS_ID,
      name: 'Test Business',
      email: 'test@example.com',
      phone: '+15550000000',
      owner_name: NAME
    });
  }

  // 2. Create/Update Auth User
  console.log('Creating/Updating Auth User...');
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME }
  });

  if (authError) {
    // If user exists, update password
    console.log('User might exist, trying to update password...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === EMAIL);
    
    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: PASSWORD,
        user_metadata: { name: NAME }
      });
      console.log('Password updated.');
      
      // Update public user record
      await upsertPublicUser(existingUser.id);
    } else {
      console.error('Error creating user:', authError);
    }
  } else if (user) {
    console.log('Auth user created.');
    await upsertPublicUser(user.id);
  }
}

async function upsertPublicUser(authUserId) {
  console.log(`Upserting public user for ${authUserId}...`);
  
  // Check if exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (existing) {
      console.log('User exists in public table, updating...');
      const { error } = await supabase
        .from('users')
        .update({
          business_id: BUSINESS_ID,
          name: NAME,
          email: EMAIL,
          role: 'owner',
          status: 'active'
        })
        .eq('id', existing.id);
        
       if (error) console.error('Error updating public user:', error);
       else console.log('Public user updated.');
  } else {
      console.log('Inserting new public user...');
      const { error } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          business_id: BUSINESS_ID,
          name: NAME,
          email: EMAIL,
          role: 'owner',
          status: 'active'
        });
        
       if (error) console.error('Error inserting public user:', error);
       else console.log('Public user inserted.');
  }
}

run();
