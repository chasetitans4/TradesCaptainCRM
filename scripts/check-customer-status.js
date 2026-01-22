
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

console.log('Script started');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCustomer() {
  try {
    console.log('Checking customer client@example.com...');
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, name, business_id')
      .eq('email', 'client@example.com');

    if (error) {
      console.error('Error fetching customer:', error);
      return;
    }

    if (!customers || customers.length === 0) {
      console.log('Customer not found!');
      return;
    }

    const customer = customers[0];
    console.log('Customer found:', customer);

    const { data: access, error: accessError } = await supabase
      .from('customer_portal_access')
      .select('*')
      .eq('customer_id', customer.id);

    if (accessError) {
      console.error('Error fetching portal access:', accessError);
      return;
    }

    if (!access || access.length === 0) {
      console.log('Portal access record not found!');
    } else {
      console.log('Portal access record found:', access[0]);
      console.log('Password hash length:', access[0].password_hash ? access[0].password_hash.length : 0);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkCustomer();
