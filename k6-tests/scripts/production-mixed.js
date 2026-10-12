// =====================================================================
// PRODUCTION-LIKE MIXED TEST
// =====================================================================
// What it does : Runs several kinds of users AT THE SAME TIME, like a real day:
//                  - browsers  (most users, just look at pages)
//                  - searchers (some users, search requests)
//                  - writers   (a few requests per second that POST data)  <- optional
// Why          : Real traffic is a mix, not one page hammered by everyone.
// Run          : k6 run scripts/production-mixed.js
//                k6 run -e ENV=staging scripts/production-mixed.js
//                k6 run -e ENV=staging -e ENABLE_WRITE_TEST=true scripts/production-mixed.js
// =====================================================================
import { Rate, Trend } from 'k6/metrics';
import { ENDPOINTS, ENABLE_WRITE_TEST, banner } from '../config/config.js';
import { get, post, think } from '../lib/helpers.js';

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
// --- Browsers: ramp up, hold, ramp down ---
const BROWSE_USERS = Number(__ENV.BROWSE_USERS) || 70;   // browsers at the same time
const RAMP_UP = '3m';
const HOLD = '10m';
const RAMP_DOWN = '3m';

// --- Searchers and writers run for this long ---
// Keep it equal to RAMP_UP + HOLD + RAMP_DOWN above (3m + 10m + 3m = 16m).
const TEST_TIME = '16m';

// --- Searchers ---
const SEARCH_USERS = Number(__ENV.SEARCH_USERS) || 20;  // searchers at the same time

// --- Writers (only run when ENABLE_WRITE_TEST is true in config.js or on the command line) ---
const WRITE_RATE = Number(__ENV.WRITE_RATE) || 5;       // POST requests per second

const THINK_MIN_SECONDS = 1;
const THINK_MAX_SECONDS = 3;

const P95_MS = 1000;           // 95% of all requests faster than this (ms)
const BROWSE_P95_MS = 800;     // stricter limit for the browsing pages (ms)
const MAX_ERROR_RATE = 0.01;   // at most 1% failed requests

// ---------------------------------------------------------------------
// Custom metrics (show up at the bottom of the k6 summary)
// ---------------------------------------------------------------------
const errorRate = new Rate('errors');                 // share of failed requests
const browseDuration = new Trend('browse_duration');  // response time of browsing requests

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
const scenarios = {
  browsing: {
    executor: 'ramping-vus',
    exec: 'browse',            // runs the function named "browse" below
    startVUs: 0,
    stages: [
      { duration: RAMP_UP, target: BROWSE_USERS },
      { duration: HOLD, target: BROWSE_USERS },
      { duration: RAMP_DOWN, target: 0 },
    ],
  },
  searching: {
    executor: 'constant-vus',
    exec: 'search',            // runs the function named "search" below
    vus: SEARCH_USERS,
    duration: TEST_TIME,
  },
};

const thresholds = {
  http_req_failed: [`rate<${MAX_ERROR_RATE}`],
  http_req_duration: [`p(95)<${P95_MS}`],
  errors: [`rate<${MAX_ERROR_RATE}`],
  browse_duration: [`p(95)<${BROWSE_P95_MS}`],
};

if (ENABLE_WRITE_TEST) {
  scenarios.writing = {
    executor: 'constant-arrival-rate',   // fixed number of POSTs per second
    exec: 'write',                       // runs the function named "write" below
    rate: WRITE_RATE,
    timeUnit: '1s',
    duration: TEST_TIME,
    preAllocatedVUs: 20,
    maxVUs: 100,
  };
  thresholds['http_req_duration{scenario:writing}'] = ['p(95)<1500'];
}

export const options = { scenarios, thresholds };

export function setup() {
  banner('mixed');
  if (!ENABLE_WRITE_TEST) {
    console.log('Write scenario is OFF. Turn it on with -e ENABLE_WRITE_TEST=true');
  }
}

// ---------------------------------------------------------------------
// User behaviours
// ---------------------------------------------------------------------
export function browse() {
  const res = get(ENDPOINTS.home);
  browseDuration.add(res.timings.duration);
  errorRate.add(res.status < 200 || res.status >= 300);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);

  const res2 = get(ENDPOINTS.contacts);
  browseDuration.add(res2.timings.duration);
  errorRate.add(res2.status < 200 || res2.status >= 300);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}

export function search() {
  const res = get(ENDPOINTS.search);
  errorRate.add(res.status < 200 || res.status >= 300);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}

export function write() {
  // CHANGE HERE: the data you send. __VU = user number, __ITER = loop number.
  const body = { name: `test-user-${__VU}-${__ITER}`, createdAt: Date.now() };
  const res = post(ENDPOINTS.write, body);
  errorRate.add(res.status < 200 || res.status >= 300);
}
