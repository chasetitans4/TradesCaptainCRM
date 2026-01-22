
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogin() {
  const email = 'client@example.com';
  const password = 'password123';
  // Use the exact business ID from memory
  const businessId = '11111111-1111-1111-1111-111111111111';

  console.log(`Attempting login for:`);
  console.log(`Email: ${email}`);
  console.log(`Business ID: ${businessId}`);

  // 1. Check if record exists
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
    
    // Debug: Search by email only to see if business ID is wrong
    const { data: anyAccess } = await supabase
        .from('customer_portal_access')
        .select('*')
        .eq('email', email);
        
    if (anyAccess && anyAccess.length > 0) {
        console.log('Found records with this email but different business_id:', anyAccess.map(a => a.business_id));
    } else {
        console.log('No records found with this email at all.');
    }
    return;
  }

  console.log('Access record found:', {
    id: access.id,
    email: access.email,
    has_password_hash: !!access.password_hash,
    is_active: access.is_active
  });

  if (!access.is_active) {
      console.error('Account is inactive');
      return;
  }

  if (!access.password_hash) {
      console.error('No password hash set');
      return;
  }

  // 2. Compare password
  const isValid = await bcrypt.compare(password, access.password_hash);
  console.log(`Password '${password}' valid?`, isValid);

  if (!isValid) {
      console.log('Generating new hash for password123 to compare...');
      const newHash = await bcrypt.hash(password, 12);
      console.log('New hash example:', newHash);
      console.log('Stored hash:', access.password_hash);
  } else {
      console.log('SUCCESS! Login should work.');
  }
}

testLogin().catch(console.error);
