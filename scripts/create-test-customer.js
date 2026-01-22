const bcrypt = require('bcryptjs');

const url = 'https://abafispmjdpryjkevath.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const businessId = "11111111-1111-1111-1111-111111111111";
const customerId = "22222222-2222-2222-2222-222222222222";
const email = "client@example.com";

async function run() {
  console.log('Starting script...');
  if (typeof fetch === 'undefined') {
    console.error('Fetch is not defined! Use Node 18+');
    return;
  }
  
  console.log('Creating test customer...');
  
  // 1. Create Customer
  try {
    const res = await fetch(`${url}/customers`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: customerId,
        business_id: businessId,
        name: "Test Client",
        phone: "+15559998888",
        email: email,
        address_line1: "123 Test St",
        city: "Testville",
        state: "TS",
        zip: "12345"
      })
    });
    
    if (!res.ok) {
       const txt = await res.text();
       console.log('Customer creation status:', res.status, txt);
    } else {
       console.log('Customer created');
    }
  } catch (e) {
    console.error('Customer error:', e);
  }

  // 2. Create Portal Access
  try {
    console.log('Hashing password...');
    const hash = await bcrypt.hash("password123", 12);
    console.log('Hash created, inserting access...');
    
    const res = await fetch(`${url}/customer_portal_access`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        customer_id: customerId,
        business_id: businessId,
        email: email,
        password_hash: hash,
        is_active: true,
        email_verified: true
      })
    });
    if (!res.ok) {
       const txt = await res.text();
       console.log('Portal access creation status:', res.status, txt);
    } else {
       console.log('Portal access created');
    }
  } catch (e) {
    console.error('Portal access error:', e);
  }
}

run().catch(e => console.error('Script error:', e));
