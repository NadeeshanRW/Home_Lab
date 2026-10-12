// =====================================================================
// SOAK TEST  (endurance)
// =====================================================================
// What it does : A normal, steady number of users for a LONG time (hours).
// Why          : Finds slow problems that a short test never shows:
//                memory leaks, DB connections not released, disk filling up, logs growing.
// Tip          : Watch your server CPU / memory graphs while this runs.
//                The line should stay flat. A line that keeps climbing = a leak.
// Run          : k6 run -e ENV=staging scripts/soak.js        (do NOT run on production)
//                k6 run -e ENV=staging -e SOAK_TIME=8h scripts/soak.js
// =====================================================================
import { ENDPOINTS, banner, guardProduction } from '../config/config.js';
import { get, think } from '../lib/helpers.js';

guardProduction('soak'); // blocks this test on production unless -e ALLOW_PROD=true

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
const USERS = Number(__ENV.USERS) || 40;         // steady number of users (use ~60-70% of your peak)
const RAMP_UP = '5m';                            // time to reach USERS
const SOAK_TIME = __ENV.SOAK_TIME || '4h';       // how long to hold. Use '8h' or more for a serious soak
const RAMP_DOWN = '5m';                          // time to go back to 0

const THINK_MIN_SECONDS = 1;
const THINK_MAX_SECONDS = 4;

const MAX_RESPONSE_MS = 800;   // single request slower than this fails a check
const P95_MS = 800;            // 95% of requests must be faster than this (ms)
const MAX_ERROR_RATE = 0.01;   // 0.01 = at most 1% failed requests

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
export const options = {
  stages: [
    { duration: RAMP_UP, target: USERS },
    { duration: SOAK_TIME, target: USERS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    http_req_duration: [`p(95)<${P95_MS}`],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  banner('soak');
}

export default function () {
  get(ENDPOINTS.home, MAX_RESPONSE_MS);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);

  get(ENDPOINTS.contacts, MAX_RESPONSE_MS);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}
