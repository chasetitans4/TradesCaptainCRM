#!/usr/bin/env node

/**
 * Load Testing Script
 * Run with: node scripts/perf/load-test.js
 *
 * Environment variables:
 *   BASE_URL - Target URL (default: http://localhost:3000)
 *   CONCURRENCY - Number of concurrent workers (default: 50)
 *   DURATION_MS - Test duration in milliseconds (default: 30000)
 *   RAMP_UP_MS - Time to ramp up to full concurrency (default: 5000)
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  concurrency: parseInt(process.env.CONCURRENCY) || 50,
  durationMs: parseInt(process.env.DURATION_MS) || 30000,
  rampUpMs: parseInt(process.env.RAMP_UP_MS) || 5000,
  timeout: parseInt(process.env.TIMEOUT_MS) || 10000,
};

// Test endpoints
const endpoints = [
  // Public pages
  { path: '/', method: 'GET', name: 'Home' },
  { path: '/login', method: 'GET', name: 'Login Page' },
  { path: '/api/health', method: 'GET', name: 'Health Check' },

  // Protected pages (will return 401/redirect without auth)
  { path: '/dashboard', method: 'GET', name: 'Dashboard' },
  { path: '/customers', method: 'GET', name: 'Customers' },
  { path: '/jobs', method: 'GET', name: 'Jobs' },

  // API endpoints
  { path: '/api/health?detailed=true', method: 'GET', name: 'Health Detailed' },
];

// Metrics storage
const metrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  byEndpoint: {},
  latencies: [],
  statusCodes: {},
  startTime: 0,
  endTime: 0,
};

// Initialize endpoint metrics
endpoints.forEach((ep) => {
  metrics.byEndpoint[ep.name] = {
    requests: 0,
    successes: 0,
    failures: 0,
    latencies: [],
    statusCodes: {},
  };
});

/**
 * Make HTTP request
 */
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(endpoint.path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      timeout: config.timeout,
      headers: {
        'User-Agent': 'LoadTest/1.0',
        'Accept': 'application/json, text/html',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          success: res.statusCode < 500,
          statusCode: res.statusCode,
          latency,
          endpoint: endpoint.name,
        });
      });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        latency,
        endpoint: endpoint.name,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        latency,
        endpoint: endpoint.name,
        error: 'timeout',
      });
    });

    req.end();
  });
}

/**
 * Worker function that continuously makes requests
 */
async function worker(workerId, stopSignal) {
  while (!stopSignal.stopped) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const result = await makeRequest(endpoint);

    // Update metrics
    metrics.requests++;
    metrics.latencies.push(result.latency);

    const epMetrics = metrics.byEndpoint[result.endpoint];
    epMetrics.requests++;
    epMetrics.latencies.push(result.latency);

    if (result.success) {
      metrics.successes++;
      epMetrics.successes++;
    } else {
      metrics.failures++;
      epMetrics.failures++;
    }

    // Track status codes
    const code = result.statusCode.toString();
    metrics.statusCodes[code] = (metrics.statusCodes[code] || 0) + 1;
    epMetrics.statusCodes[code] = (epMetrics.statusCodes[code] || 0) + 1;

    // Small delay to prevent overwhelming
    await new Promise((r) => setTimeout(r, 10));
  }
}

/**
 * Calculate percentiles
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('\n📊 Load Test Configuration');
  console.log('━'.repeat(50));
  console.log(`  Target URL:    ${config.baseUrl}`);
  console.log(`  Concurrency:   ${config.concurrency} workers`);
  console.log(`  Duration:      ${config.durationMs / 1000}s`);
  console.log(`  Ramp-up:       ${config.rampUpMs / 1000}s`);
  console.log(`  Timeout:       ${config.timeout / 1000}s`);
  console.log('━'.repeat(50));

  const stopSignal = { stopped: false };
  const workers = [];

  console.log('\n🚀 Starting load test...\n');
  metrics.startTime = Date.now();

  // Ramp up workers gradually
  const rampInterval = config.rampUpMs / config.concurrency;
  for (let i = 0; i < config.concurrency; i++) {
    workers.push(worker(i, stopSignal));
    if (i < config.concurrency - 1) {
      await new Promise((r) => setTimeout(r, rampInterval));
    }
    process.stdout.write(`\rWorkers started: ${i + 1}/${config.concurrency}`);
  }
  console.log('\n');

  // Progress updates
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const rps = metrics.requests / elapsed;
    process.stdout.write(
      `\r⏱️  Elapsed: ${elapsed.toFixed(1)}s | Requests: ${metrics.requests} | RPS: ${rps.toFixed(1)} | Errors: ${metrics.failures}`
    );
  }, 1000);

  // Wait for test duration
  await new Promise((r) => setTimeout(r, config.durationMs));

  // Stop workers
  stopSignal.stopped = true;
  clearInterval(progressInterval);
  metrics.endTime = Date.now();

  // Wait for all workers to finish current requests
  await Promise.all(workers);

  console.log('\n\n');
  printResults();
}

/**
 * Print test results
 */
function printResults() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const rps = metrics.requests / duration;

  console.log('📈 Load Test Results');
  console.log('━'.repeat(50));
  console.log(`\n  Total Requests:  ${metrics.requests}`);
  console.log(`  Successes:       ${metrics.successes} (${((metrics.successes / metrics.requests) * 100).toFixed(1)}%)`);
  console.log(`  Failures:        ${metrics.failures} (${((metrics.failures / metrics.requests) * 100).toFixed(1)}%)`);
  console.log(`  Duration:        ${duration.toFixed(2)}s`);
  console.log(`  Requests/sec:    ${rps.toFixed(2)}`);

  console.log('\n📊 Latency (ms)');
  console.log('━'.repeat(50));
  console.log(`  Min:     ${Math.min(...metrics.latencies)}ms`);
  console.log(`  Max:     ${Math.max(...metrics.latencies)}ms`);
  console.log(`  Mean:    ${(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length).toFixed(2)}ms`);
  console.log(`  P50:     ${percentile(metrics.latencies, 50)}ms`);
  console.log(`  P95:     ${percentile(metrics.latencies, 95)}ms`);
  console.log(`  P99:     ${percentile(metrics.latencies, 99)}ms`);

  console.log('\n📋 Status Codes');
  console.log('━'.repeat(50));
  Object.entries(metrics.statusCodes)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([code, count]) => {
      const pct = ((count / metrics.requests) * 100).toFixed(1);
      const status = getStatusDescription(parseInt(code));
      console.log(`  ${code}: ${count} (${pct}%) - ${status}`);
    });

  console.log('\n📍 Per-Endpoint Results');
  console.log('━'.repeat(50));
  Object.entries(metrics.byEndpoint).forEach(([name, ep]) => {
    if (ep.requests === 0) return;
    console.log(`\n  ${name}:`);
    console.log(`    Requests:   ${ep.requests}`);
    console.log(`    Success:    ${((ep.successes / ep.requests) * 100).toFixed(1)}%`);
    console.log(`    P50:        ${percentile(ep.latencies, 50)}ms`);
    console.log(`    P95:        ${percentile(ep.latencies, 95)}ms`);
  });

  console.log('\n');

  // Exit with error code if too many failures
  const errorRate = metrics.failures / metrics.requests;
  if (errorRate > 0.1) {
    console.log('⚠️  Warning: Error rate > 10%');
    process.exit(1);
  }
}

/**
 * Get status code description
 */
function getStatusDescription(code) {
  const descriptions = {
    0: 'Connection Error/Timeout',
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found (Redirect)',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    429: 'Rate Limited',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return descriptions[code] || 'Unknown';
}

// Run the test
runLoadTest().catch(console.error);
