const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

// User Details
const CUSTOMER_EMAIL = 'captain@tradescaptain.com';
const CUSTOMER_PHONE = '+15559998888';
const CUSTOMER_NAME = 'Captain User';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Seeding Captain User and Generating Magic Link...');

  // 1. Ensure Customer Exists
  let customerId;
  
  // Try to find by Email first
  const { data: byEmail } = await supabase
    .from('customers')
    .select('id')
    .eq('email', CUSTOMER_EMAIL)
    .eq('business_id', BUSINESS_ID)
    .single();

  if (byEmail) {
    customerId = byEmail.id;
    console.log(`Customer found by email: ${customerId}`);
  } else {
    // Try to find by Phone
    const { data: byPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', CUSTOMER_PHONE)
      .eq('business_id', BUSINESS_ID)
      .single();
      
    if (byPhone) {
        customerId = byPhone.id;
        console.log(`Customer found by phone: ${customerId}. Updating email...`);
        // Update email to match what we want
        await supabase.from('customers').update({ email: CUSTOMER_EMAIL }).eq('id', customerId);
    } else {
        console.log('Creating new customer...');
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            business_id: BUSINESS_ID,
            name: CUSTOMER_NAME,
            email: CUSTOMER_EMAIL,
            phone: CUSTOMER_PHONE,
            address_line1: '123 Ocean Drive',
            city: 'Port Royal',
            state: 'FL',
            zip: '33000'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating customer:', createError);
          process.exit(1);
        }
        customerId = newCustomer.id;
        console.log(`Customer created: ${customerId}`);
    }
  }

  // 2. Ensure Portal Access
  const { data: access, error: accessError } = await supabase
    .from('customer_portal_access')
    .select('id')
    .eq('customer_id', customerId)
    .eq('business_id', BUSINESS_ID)
    .single();

  let accessId;
  if (accessError && accessError.code === 'PGRST116') {
    console.log('Creating portal access...');
    const { data: newAccess, error: createAccessError } = await supabase
      .from('customer_portal_access')
      .insert({
        customer_id: customerId,
        business_id: BUSINESS_ID,
        email: CUSTOMER_EMAIL,
        is_active: true
      })
      .select()
      .single();
    
    if (createAccessError) {
      console.error('Error creating portal access:', createAccessError);
      process.exit(1);
    }
    accessId = newAccess.id;
  } else if (access) {
    accessId = access.id;
    console.log('Portal access exists.');
  } else {
    console.error('Error checking portal access:', accessError);
    process.exit(1);
  }

  // 3. Generate Magic Link
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  // Expires in 24 hours for dev convenience
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('customer_portal_access')
    .update({
      magic_link_token: tokenHash,
      magic_link_expires_at: expiresAt
    })
    .eq('id', accessId);

  if (updateError) {
    console.error('Error updating magic link token:', updateError);
    process.exit(1);
  }

  const magicLink = `http://localhost:3001/portal/auth/verify?token=${token}&business=${BUSINESS_ID}`;

  console.log('\n=================================================================');
  console.log('LOGIN LINK GENERATED (Valid for 24 hours):');
  console.log(magicLink);
  console.log('=================================================================\n');
}

run().catch(console.error);
