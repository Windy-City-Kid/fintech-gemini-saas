import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp up to 200 users
    { duration: '1m', target: 500 },   // Stress test at 500 users
    { duration: '1m', target: 1000 },  // Peak stress at 1000 users
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:8080');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
