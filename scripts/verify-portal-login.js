
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyLogin() {
  const businessId = '11111111-1111-1111-1111-111111111111';
  const email = 'client@example.com';
  const password = 'password123';

  console.log(`Checking login for ${email} in business ${businessId}...`);

  const { data: access, error } = await supabase
    .from('customer_portal_access')
    .select('*')
    .eq('business_id', businessId)
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching access record:', error);
    return;
  }

  if (!access) {
    console.error('No access record found!');
    return;
  }

  console.log('Found access record:', {
    id: access.id,
    email: access.email,
    hasPasswordHash: !!access.password_hash,
    is_active: access.is_active
  });

  if (access.is_active === false) {
    console.error('❌ ACCOUNT IS INACTIVE');
    // Reactivate
    await supabase.from('customer_portal_access').update({ is_active: true }).eq('id', access.id);
    console.log('Reactivated account.');
  }

  if (!access.password_hash) {
    console.error('No password hash set!');
    return;
  }

  const isValid = await bcrypt.compare(password, access.password_hash);
  console.log('Password verification result:', isValid);

  if (isValid) {
    console.log('✅ LOGIN SHOULD WORK');
  } else {
    console.error('❌ PASSWORD MISMATCH');
    
    // Attempt to reset it to be sure
    const newHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await supabase
        .from('customer_portal_access')
        .update({ password_hash: newHash })
        .eq('id', access.id);
        
    if (updateError) {
        console.error('Failed to reset password:', updateError);
    } else {
        console.log('Reset password to known value. Try again.');
    }
  }
}

verifyLogin();
