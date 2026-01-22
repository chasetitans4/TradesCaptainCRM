const url = 'https://abafispmjdpryjkevath.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';
const customerId = "22222222-2222-2222-2222-222222222222";

async function run() {
  console.log('Inspecting customer:', customerId);
  
  try {
    const res = await fetch(`${url}/customers?id=eq.${customerId}`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!res.ok) {
       console.log('Error:', res.status, await res.text());
    } else {
       const data = await res.json();
       console.log('Found customers:', data.length);
       if (data.length > 0) {
         console.log('Customer:', JSON.stringify(data[0], null, 2));
       }
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
