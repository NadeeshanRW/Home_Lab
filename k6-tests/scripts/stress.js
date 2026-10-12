// =====================================================================
// STRESS TEST
// =====================================================================
// What it does : Raises the number of users step by step, ABOVE normal traffic,
//                and holds each step for a while.
// Why          : Find the point where the site gets slow or starts to fail,
//                and check that it recovers afterwards.
// Run          : k6 run -e ENV=staging scripts/stress.js      (do NOT run on production)
//                k6 run -e ENV=staging -e USER_STEPS=100,200,400 scripts/stress.js
// =====================================================================
import { ENDPOINTS, banner, guardProduction } from '../config/config.js';
import { get, think } from '../lib/helpers.js';

guardProduction('stress'); // blocks this test on production unless -e ALLOW_PROD=true

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
// The user levels to try, in order. Each number is one "step".
// Example: [50, 100, 200, 300] -> 50 users, then 100, then 200, then 300.
const USER_STEPS = __ENV.USER_STEPS
  ? __ENV.USER_STEPS.split(',').map(Number)
  : [50, 100, 200, 300];

const RAMP_TIME = __ENV.RAMP_TIME || '2m';   // time to climb to the next step
const HOLD_TIME = __ENV.HOLD_TIME || '5m';   // time to stay on each step
const RECOVERY_TIME = '5m';                  // time to go back to 0 users at the end

const THINK_MIN_SECONDS = 1;
const THINK_MAX_SECONDS = 2;

const P95_MS = 2000;           // allowed to be slower than in a load test (ms)
const MAX_ERROR_RATE = 0.05;   // 0.05 = up to 5% errors allowed while stressing

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
const stages = [];
for (const users of USER_STEPS) {
  stages.push({ duration: RAMP_TIME, target: users }); // climb
  stages.push({ duration: HOLD_TIME, target: users }); // hold
}
stages.push({ duration: RECOVERY_TIME, target: 0 });   // recover

export const options = {
  stages,
  thresholds: {
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export function setup() {
  banner('stress');
}

export default function () {
  get(ENDPOINTS.home);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);

  get(ENDPOINTS.contacts);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}
