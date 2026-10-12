// =====================================================================
// LOAD TEST  (average / normal traffic)
// =====================================================================
// What it does : Slowly adds users up to your NORMAL traffic level,
//                keeps them there for a while, then slowly removes them.
// Why          : Checks that the site meets its speed targets on a normal day.
// Run          : k6 run scripts/load.js
//                k6 run -e ENV=staging scripts/load.js
//                k6 run -e USERS=100 -e HOLD=20m scripts/load.js    (override on the fly)
// =====================================================================
import { ENDPOINTS, banner } from '../config/config.js';
import { get, think } from '../lib/helpers.js';

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
const USERS = Number(__ENV.USERS) || 50;       // how many users at the same time during the steady part
const RAMP_UP = __ENV.RAMP_UP || '2m';         // time to go from 0 to USERS
const HOLD = __ENV.HOLD || '10m';              // time to stay at USERS  (this is the main test time)
const RAMP_DOWN = __ENV.RAMP_DOWN || '2m';     // time to go from USERS back to 0

const THINK_MIN_SECONDS = 1;   // pause between requests (real users do not click instantly)
const THINK_MAX_SECONDS = 3;

const P95_MS = 800;            // 95% of requests must be faster than this (ms)
const P99_MS = 1500;           // 99% of requests must be faster than this (ms)
const MAX_ERROR_RATE = 0.01;   // 0.01 = at most 1% failed requests

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
export const options = {
  stages: [
    { duration: RAMP_UP, target: USERS },
    { duration: HOLD, target: USERS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    http_req_duration: [`p(95)<${P95_MS}`, `p(99)<${P99_MS}`],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  banner('load');
}

// One loop = one "visit" of a user. Edit the list to match real user behaviour.
// Every get() line is one request.
export default function () {
  get(ENDPOINTS.home);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);

  get(ENDPOINTS.contacts);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);

  get(ENDPOINTS.news);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}
