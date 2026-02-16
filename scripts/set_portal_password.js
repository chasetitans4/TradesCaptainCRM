const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration (same as seed_captain_login.js)
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

const CUSTOMER_EMAIL = 'captain@tradescaptain.com';
const NEW_PASSWORD = 'customer123';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log(`Setting password for ${CUSTOMER_EMAIL}...`);

  // 1. Find the portal access record
  const { data: access, error: findError } = await supabase
    .from('customer_portal_access')
    .select('id, customer_id')
    .eq('business_id', BUSINESS_ID)
    .eq('email', CUSTOMER_EMAIL)
    .single();

  if (findError || !access) {
    console.error('Error finding portal access:', findError || 'Record not found');
    console.log('Please run scripts/seed_captain_login.js first.');
    process.exit(1);
  }

  console.log(`Found access record: ${access.id} (Customer: ${access.customer_id})`);

  // 2. Hash the password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, salt);

  // 3. Update the record
  const { error: updateError } = await supabase
    .from('customer_portal_access')
    .update({
      password_hash: passwordHash,
      email_verified: true, // Auto-verify email since we are manually setting password
      is_active: true
    })
    .eq('id', access.id);

  if (updateError) {
    console.error('Error updating password:', updateError);
    process.exit(1);
  }

  console.log('✅ Password successfully set!');
  console.log(`Email: ${CUSTOMER_EMAIL}`);
  console.log(`Password: ${NEW_PASSWORD}`);
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
