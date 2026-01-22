const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const EMAIL = 'captain@tradescaptain.com';
const NEW_PASSWORD = 'StrongPortalPass2025!';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log(`Setting password for ${EMAIL}...`);

  try {
    // 1. Find the customer first (more reliable)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', EMAIL)
      .eq('business_id', BUSINESS_ID)
      .single();

    if (customerError) {
        console.error('Error finding customer:', customerError.message);
        process.exit(1);
    }

    console.log(`Found customer: ${customer.id}`);

    // 2. Find the portal access record by customer_id
    const { data: access, error: findError } = await supabase
      .from('customer_portal_access')
      .select('id, customer_id')
      .eq('customer_id', customer.id)
      .eq('business_id', BUSINESS_ID)
      .single();

    if (findError) {
      console.error('Error finding access record:', findError.message);
      if (findError.code === 'PGRST116') {
        console.error('Portal access not found.');
      }
      process.exit(1);
    }

    console.log(`Found user access record: ${access.id}`);

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    // 4. Update the record
    const { error: updateError } = await supabase
      .from('customer_portal_access')
      .update({ 
          password_hash: hash,
          // Ensure email is synced just in case
          email: EMAIL 
      })
      .eq('id', access.id);

    if (updateError) {
      console.error('Error updating password:', updateError.message);
      process.exit(1);
    }

    console.log('Success! Password has been set.');
    console.log('Email: ' + EMAIL);
    console.log('Password: ' + NEW_PASSWORD);

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
