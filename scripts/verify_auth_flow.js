
const fetch = require('node-fetch');

async function testAuthFlow() {
  const loginUrl = 'http://localhost:3000/api/admin/auth/login';
  const meUrl = 'http://localhost:3000/api/admin/auth/me';
  
  const credentials = {
    email: 'admin@tradescaptain.com',
    password: 'AdminPass123!'
  };

  console.log('1. Attempting login...');
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  console.log('Login Status:', loginRes.status);
  
  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    console.error('Login Failed:', errorText);
    return;
  }

  // Extract cookies
  const cookies = loginRes.headers.raw()['set-cookie'];
  if (!cookies) {
    console.error('No cookies received!');
    return;
  }
  
  console.log('Cookies received:', cookies.length);
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie Header for next request:', cookieHeader);

  console.log('\n2. Verifying session (/api/admin/auth/me)...');
  const meRes = await fetch(meUrl, {
    headers: {
      'Cookie': cookieHeader
    }
  });

  console.log('Me Status:', meRes.status);
  const meData = await meRes.json();
  console.log('Me Response:', JSON.stringify(meData, null, 2));
}

testAuthFlow().catch(console.error);
