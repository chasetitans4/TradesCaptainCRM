async function run() {
  const loginUrl = 'http://localhost:3001/api/portal/auth';
  const sessionUrl = 'http://localhost:3001/api/portal/session?businessId=11111111-1111-1111-1111-111111111111';
  
  console.log('Testing Portal API...');

  // Login
  try {
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'password',
        businessId: '11111111-1111-1111-1111-111111111111',
        email: 'client@example.com',
        password: 'password123'
      })
    });
    
    console.log('Login Status:', loginRes.status);
    
    const cookie = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie:', cookie ? 'Received' : 'Missing');
    
    if (!cookie) {
      console.error('No cookie received. Body:', await loginRes.text());
      return;
    }
    
    // Session
    const sessionRes = await fetch(sessionUrl, {
      headers: {
        'Cookie': cookie
      }
    });
    
    console.log('Session Status:', sessionRes.status);
    const text = await sessionRes.text();
    console.log('Session Body:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

run();
