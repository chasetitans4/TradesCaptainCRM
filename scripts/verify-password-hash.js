const bcrypt = require('bcryptjs');

const url = 'https://abafispmjdpryjkevath.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const businessId = "11111111-1111-1111-1111-111111111111";
const email = "client@example.com";
const password = "password123";

async function run() {
  console.log('Verifying password hash...');
  if (typeof fetch === 'undefined') {
    console.error('Fetch is not defined! Use Node 18+');
    return;
  }

  try {
    const res = await fetch(`${url}/customer_portal_access?email=eq.${encodeURIComponent(email)}&business_id=eq.${businessId}&select=password_hash`, {
        method: 'GET',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        console.error('Failed to find record:', await res.text());
        return;
    }

    const records = await res.json();
    if (records.length === 0) {
        console.error('No record found');
        return;
    }

    const hash = records[0].password_hash;
    console.log('Hash from DB:', hash);

    const match = await bcrypt.compare(password, hash);
    console.log(`Password "${password}" matches hash:`, match);
    
  } catch (e) {
    console.error('Error:', e);
  }
}

run().catch(e => console.error('Script error:', e));
