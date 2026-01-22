const bcrypt = require('bcryptjs');

const url = 'https://abafispmjdpryjkevath.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const businessId = "11111111-1111-1111-1111-111111111111";
const email = "client@example.com";

async function run() {
  console.log('Updating test customer password...');
  if (typeof fetch === 'undefined') {
    console.error('Fetch is not defined! Use Node 18+');
    return;
  }

  try {
    // 1. Find the portal access record ID first
    const findRes = await fetch(`${url}/customer_portal_access?email=eq.${encodeURIComponent(email)}&business_id=eq.${businessId}&select=id`, {
        method: 'GET',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        }
    });

    if (!findRes.ok) {
        console.error('Failed to find record:', await findRes.text());
        return;
    }

    const records = await findRes.json();
    if (records.length === 0) {
        console.error('No portal access record found for this email/business. Please run create-test-customer.js first.');
        return;
    }

    const accessId = records[0].id;
    console.log(`Found access record: ${accessId}`);

    // 2. Update the password
    console.log('Hashing new password...');
    const hash = await bcrypt.hash("password123", 12);
    
    console.log('Updating record...');
    const updateRes = await fetch(`${url}/customer_portal_access?id=eq.${accessId}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        password_hash: hash,
        is_active: true,
        last_login_at: null // Reset this just in case
      })
    });
    
    if (!updateRes.ok) {
       const txt = await updateRes.text();
       console.log('Update status:', updateRes.status, txt);
    } else {
       console.log('Password updated successfully to "password123"');
       const data = await updateRes.json();
       console.log('Updated record:', JSON.stringify(data[0], null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

run().catch(e => console.error('Script error:', e));
