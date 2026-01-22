const businessId = "11111111-1111-1111-1111-111111111111";
const email = "client@example.com";
const password = "password123";

async function run() {
  console.log('Testing login API...');
  
  try {
    const res = await fetch('http://localhost:3001/api/portal/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'password',
        businessId,
        email,
        password
      })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.ok && data.success) {
        console.log('LOGIN SUCCESSFUL!');
    } else {
        console.log('LOGIN FAILED');
    }

  } catch (e) {
    console.error('Error:', e);
  }
}

run();
