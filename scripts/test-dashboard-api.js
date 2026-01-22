
const fs = require('fs');
const path = require('path');

async function run() {
  const loginUrl = 'http://localhost:3001/api/portal/auth';
  const dashboardUrl = 'http://localhost:3001/api/portal/dashboard?businessId=11111111-1111-1111-1111-111111111111';
  
  console.log('Testing Portal Dashboard API...');

  // 1. Login to get the cookie
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
    
    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.status, await loginRes.text());
      return;
    }
    
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) {
      console.error('No cookie received');
      return;
    }
    
    console.log('Login successful, cookie received.');

    // 2. Fetch Dashboard
    const dashboardRes = await fetch(dashboardUrl, {
      headers: {
        'Cookie': cookie
      }
    });
    
    console.log('Dashboard Status:', dashboardRes.status);
    
    if (dashboardRes.status === 200) {
      const data = await dashboardRes.json();
      console.log('Dashboard Data:', JSON.stringify(data, null, 2));
    } else {
      console.error('Dashboard Error:', await dashboardRes.text());
    }

  } catch (e) {
    console.error('Fetch error:', e);
  }
}

run();
