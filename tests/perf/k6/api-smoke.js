import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || '30s',
};

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'responds quickly': (r) => r.timings.duration < 300,
  });
  sleep(1);
}
