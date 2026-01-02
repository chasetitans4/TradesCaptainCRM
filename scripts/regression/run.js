const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      resolve({ statusCode: res.statusCode });
      res.resume();
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const tests = [
    {
      name: 'Auth login page responds',
      url: `${base}/login`,
      expect: [200],
    },
    {
      name: 'Dashboard page responds',
      url: `${base}/dashboard`,
      expect: [200, 307],
    },
    {
      name: 'Portal login page responds without redirect loop',
      url: `${base}/portal/test/login`,
      expect: [200, 307],
    },
  ];

  let failed = 0;
  for (const t of tests) {
    try {
      const res = await get(t.url);
      const ok = Array.isArray(t.expect) ? t.expect.includes(res.statusCode) : res.statusCode === t.expect;
      console.log(`${ok ? 'PASS' : 'FAIL'} - ${t.name} (${res.statusCode})`);
      if (!ok) failed++;
    } catch (err) {
      console.log(`FAIL - ${t.name} (${err.message})`);
      failed++;
    }
  }

  process.exit(failed ? 1 : 0);
}

main();
