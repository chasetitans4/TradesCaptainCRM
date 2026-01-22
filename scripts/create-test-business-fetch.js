const url = 'https://abafispmjdpryjkevath.supabase.co/rest/v1/businesses';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

async function run() {
  console.log('Using Fetch to insert business...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Test Business For Portal",
        owner_name: "Test Owner",
        email: "test@tradescaptain.com",
        phone: "+15550001111",
        plan_tier: "starter"
      })
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

run();
