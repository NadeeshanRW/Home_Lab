// =====================================================================
// BREAKPOINT TEST
// =====================================================================
// What it does : Keeps increasing the number of REQUESTS PER SECOND until the
//                site breaks. The test stops by itself when the limits below are crossed.
// Why          : Tells you the maximum capacity of the system.
//                Look at the "iterations" rate in the summary at the moment it stopped.
// Run          : k6 run -e ENV=staging scripts/breakpoint.js  (do NOT run on production)
//                k6 run -e ENV=staging -e MAX_RATE=2000 scripts/breakpoint.js
// =====================================================================
import { ENDPOINTS, banner, guardProduction } from '../config/config.js';
import { get } from '../lib/helpers.js';

guardProduction('breakpoint'); // blocks this test on production unless -e ALLOW_PROD=true

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
const START_RATE = Number(__ENV.START_RATE) || 10;     // requests per second at the start
const MAX_RATE = Number(__ENV.MAX_RATE) || 1000;       // requests per second at the end of the test
const TEST_TIME = __ENV.TEST_TIME || '20m';            // time to climb from START_RATE to MAX_RATE

const PRE_ALLOCATED_USERS = 100;   // virtual users k6 prepares in advance
const MAX_USERS = 2000;            // k6 may create up to this many users if the site gets slow
                                   // (raise this if you see "Insufficient VUs" warnings)

const STOP_IF_P95_ABOVE_MS = 2000;   // stop the test when 95% of requests are slower than this
const STOP_IF_ERRORS_ABOVE = 0.05;   // stop the test when more than 5% of requests fail

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
export const options = {
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',   // controls requests per second, not users
      startRate: START_RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_ALLOCATED_USERS,
      maxVUs: MAX_USERS,
      stages: [{ duration: TEST_TIME, target: MAX_RATE }],
    },
  },
  thresholds: {
    // abortOnFail = stop the whole test as soon as the limit is crossed
    // delayAbortEval = ignore the first minute so a slow start does not stop it too early
    http_req_failed: [{ threshold: `rate<${STOP_IF_ERRORS_ABOVE}`, abortOnFail: true, delayAbortEval: '1m' }],
    http_req_duration: [{ threshold: `p(95)<${STOP_IF_P95_ABOVE_MS}`, abortOnFail: true, delayAbortEval: '1m' }],
  },
};

export function setup() {
  banner('breakpoint');
}

// No think time here on purpose: the executor itself decides how many requests per second to send.
export default function () {
  get(ENDPOINTS.home);
}
