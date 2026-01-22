

async function testLogin() {
  const url = 'http://localhost:3000/api/admin/auth/login';
  const body = {
    email: 'admin@tradescaptain.com',
    password: 'AdminPass123!'
  };

  try {
    console.log('Testing login to:', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });


    console.log('Status:', res.status);
    console.log('Headers:', JSON.stringify(Object.fromEntries(res.headers), null, 2));
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLogin();
