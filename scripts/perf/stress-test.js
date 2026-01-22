const autocannon = require('autocannon');

const BASE_URL = 'http://localhost:3000';

// Configuration for different test profiles
const PROFILES = {
  baseline: {
    connections: 10,
    duration: 10,
    title: 'BASELINE TEST (Normal Load)',
    url: `${BASE_URL}/api/health`,
  },
  stress: {
    connections: 100,
    duration: 20,
    pipelining: 1,
    title: 'STRESS TEST (High Concurrency)',
    url: `${BASE_URL}/api/health`,
  },
  spike: {
    connections: 500,
    duration: 10,
    title: 'SPIKE TEST (Sudden Burst)',
    url: `${BASE_URL}/api/health`,
  },
  soak: { // Shortened for demo purposes, usually hours
    connections: 50,
    duration: 30, 
    title: 'SOAK TEST (Sustained Load)',
    url: `${BASE_URL}/api/health`,
  }
};

function run(opts) {
  return new Promise((resolve, reject) => {
    autocannon({
      url: BASE_URL,
      ...opts,
    }, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });
}

async function runProfile(key) {
  const profile = PROFILES[key];
  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`STARTING: ${profile.title}`);
  console.log(`${'='.repeat(50)}`);
  
  try {
    const result = await run(profile);
    console.log(autocannon.printResult(result));
    
    // Check for errors
    if (result.errors > 0 || result.timeouts > 0) {
      console.warn(`⚠️  WARNING: ${result.errors} errors and ${result.timeouts} timeouts detected!`);
    }
    
    return result;
  } catch (err) {
    console.error('Test failed:', err);
  }
}

async function checkHealth() {
  console.log('Checking server health...');
  try {
    const start = Date.now();
    // Simple fetch check
    const fetch = (await import('node-fetch')).default || global.fetch;
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      console.log(`Server is UP (${Date.now() - start}ms)`);
      return true;
    }
  } catch (e) {
    console.log('Server not ready yet...');
  }
  return false;
}

async function main() {
  // 1. Wait for server
  let retries = 10;
  while (retries > 0) {
    if (await checkHealth()) break;
    await new Promise(r => setTimeout(r, 2000));
    retries--;
  }
  
  if (retries === 0) {
    console.error('❌ Server failed to start. Aborting tests.');
    process.exit(1);
  }

  // 2. Run Tests
  console.log('\n🚀 Starting Comprehensive Stress Test Sequence...');
  
  // Warmup
  await run({ connections: 5, duration: 5, title: 'Warmup' });

  // Execute profiles
  const results = {};
  results.baseline = await runProfile('baseline');
  
  // Cool down
  await new Promise(r => setTimeout(r, 2000));
  
  results.stress = await runProfile('stress');
  
  // Cool down
  await new Promise(r => setTimeout(r, 2000));

  results.spike = await runProfile('spike');
  
  // Cool down
  await new Promise(r => setTimeout(r, 2000));
  
  results.soak = await runProfile('soak');

  console.log('\n✅ Stress Test Sequence Completed.');
}

main();
