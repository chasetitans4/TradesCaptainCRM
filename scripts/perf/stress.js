const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { URL } = require('url');
const { exec } = require('child_process');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function makeRequest(baseUrl, path, timeoutMs, abortMs) {
  return new Promise((resolve) => {
    const target = new URL(path, baseUrl);
    const lib = target.protocol === 'https:' ? https : http;
    const start = performance.now();
    const req = lib.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + (target.search || ''),
        method: 'GET',
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          const dur = performance.now() - start;
          resolve({ statusCode: res.statusCode, durationMs: dur, ok: res.statusCode < 500 });
        });
      }
    );
    req.on('error', (err) => {
      const dur = performance.now() - start;
      resolve({ statusCode: 0, durationMs: dur, ok: false, error: err.message });
    });
    if (timeoutMs) {
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('timeout'));
      });
    }
    if (abortMs) {
      setTimeout(() => {
        try {
          req.destroy(new Error('aborted'));
        } catch {}
      }, abortMs);
    }
    req.end();
  });
}

async function sampleCpu() {
  return new Promise((resolve) => {
    exec('wmic cpu get loadpercentage /value', (err, stdout) => {
      if (err) return resolve(null);
      const match = stdout.match(/LoadPercentage=(\d+)/i);
      resolve(match ? parseInt(match[1], 10) : null);
    });
  });
}

async function sampleMemory() {
  return new Promise((resolve) => {
    exec('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value', (err, stdout) => {
      if (err) return resolve(null);
      const freeMatch = stdout.match(/FreePhysicalMemory=(\d+)/i);
      const totalMatch = stdout.match(/TotalVisibleMemorySize=(\d+)/i);
      if (!freeMatch || !totalMatch) return resolve(null);
      const freeKb = parseInt(freeMatch[1], 10);
      const totalKb = parseInt(totalMatch[1], 10);
      const usedKb = totalKb - freeKb;
      resolve({ usedMb: usedKb / 1024, totalMb: totalKb / 1024 });
    });
  });
}

async function run() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const CONCURRENCY = parseInt(process.env.CONCURRENCY || '200', 10);
  const DURATION_MS = parseInt(process.env.DURATION_MS || '60000', 10);
  const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '8000', 10);
  const PACKET_LOSS_PCT = parseInt(process.env.PACKET_LOSS_PCT || '3', 10);
  const LATENCY_MAX_MS = parseInt(process.env.LATENCY_MAX_MS || '1500', 10);
  const ABORT_PCT = parseInt(process.env.ABORT_PCT || '2', 10);

  const endpoints = [
    '/',
    '/login',
    '/dashboard',
    '/leads',
    '/customers',
    '/jobs',
    '/quotes',
    '/invoices',
    '/help',
    '/portal/test/login',
    '/api/ai/assistant?path=/dashboard',
    '/api/search?q=test',
    '/api/warranties',
    '/api/reports',
    '/api/onboarding/questionnaire',
  ];

  const perEndpoint = {};
  for (const e of endpoints) {
    perEndpoint[e] = {
      total: 0,
      ok: 0,
      errors: 0,
      statusCounts: {},
      latencies: [],
    };
  }

  const cpuSamples = [];
  const memSamples = [];
  let stop = false;
  const endAt = Date.now() + DURATION_MS;

  const sampler = setInterval(async () => {
    const cpu = await sampleCpu();
    const mem = await sampleMemory();
    if (cpu !== null) cpuSamples.push(cpu);
    if (mem) memSamples.push(mem);
  }, 1000);

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (!stop && Date.now() < endAt) {
      const path = pick(endpoints);
      if (Math.random() * 100 < PACKET_LOSS_PCT) {
        await sleep(Math.random() * 50);
        continue;
      }
      const latency = Math.floor(Math.random() * LATENCY_MAX_MS);
      await sleep(latency);
      const abort = Math.random() * 100 < ABORT_PCT ? Math.floor(Math.random() * TIMEOUT_MS) : 0;
      const res = await makeRequest(BASE_URL, path, TIMEOUT_MS, abort);
      const ep = perEndpoint[path];
      ep.total++;
      if (res.ok) ep.ok++;
      else ep.errors++;
      const sc = res.statusCode || 0;
      ep.statusCounts[sc] = (ep.statusCounts[sc] || 0) + 1;
      ep.latencies.push(res.durationMs);
    }
  });

  await Promise.all(workers);
  clearInterval(sampler);

  const summary = {};
  for (const [path, data] of Object.entries(perEndpoint)) {
    const avg = data.latencies.length
      ? data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length
      : 0;
    summary[path] = {
      total: data.total,
      ok: data.ok,
      errors: data.errors,
      avgMs: Math.round(avg),
      p50Ms: Math.round(percentile(data.latencies, 50)),
      p95Ms: Math.round(percentile(data.latencies, 95)),
      p99Ms: Math.round(percentile(data.latencies, 99)),
      statusCounts: data.statusCounts,
    };
  }

  const cpuAvg = cpuSamples.length
    ? cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length
    : 0;
  const cpuP95 = percentile(cpuSamples, 95);
  const memLast = memSamples.length ? memSamples[memSamples.length - 1] : { usedMb: 0, totalMb: 0 };

  const result = {
    config: {
      BASE_URL,
      CONCURRENCY,
      DURATION_MS,
      TIMEOUT_MS,
      PACKET_LOSS_PCT,
      LATENCY_MAX_MS,
      ABORT_PCT,
    },
    endpoints: summary,
    resources: {
      cpuAvgPct: Math.round(cpuAvg),
      cpuP95Pct: Math.round(cpuP95),
      memUsedMb: Math.round(memLast.usedMb),
      memTotalMb: Math.round(memLast.totalMb),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

run();
