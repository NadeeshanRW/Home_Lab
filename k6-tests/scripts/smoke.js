// =====================================================================
// SMOKE TEST
// =====================================================================
// What it does : 1 user visits a few pages for a short time.
// Why          : Quick "is everything alive and is my script correct?" check.
// When to run  : First, always. Also right after every deployment.
// Run          : k6 run scripts/smoke.js
//                k6 run -e ENV=staging scripts/smoke.js
// =====================================================================
import { ENDPOINTS, banner } from '../config/config.js';
import { get, think } from '../lib/helpers.js';

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
const USERS = Number(__ENV.USERS) || 1;        // number of virtual users (VUs) at the same time
const DURATION = __ENV.DURATION || '1m';       // how long the test runs: '30s', '1m', '5m' ...

// Pages every user visits, one after another, in each loop.
// Add or remove lines to change the number of requests per loop.
const PAGES = [
  ENDPOINTS.home,
  ENDPOINTS.contacts,
  ENDPOINTS.news,
];

const THINK_MIN_SECONDS = 1;   // user waits at least this long between requests
const THINK_MAX_SECONDS = 2;   // ...and at most this long

const MAX_RESPONSE_MS = 500;   // a single request slower than this fails a check
const P95_MS = 800;            // 95% of requests must be faster than this (ms)
const MAX_ERROR_RATE = 0.01;   // 0.01 = at most 1% failed requests

// ---------------------------------------------------------------------
// k6 options (you usually do not need to touch this part)
// ---------------------------------------------------------------------
export const options = {
  vus: USERS,
  duration: DURATION,
  thresholds: {
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    http_req_duration: [`p(95)<${P95_MS}`],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  banner('smoke');
}

// This function runs again and again for every virtual user.
export default function () {
  for (const page of PAGES) {
    get(page, MAX_RESPONSE_MS);
    think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
  }
}
