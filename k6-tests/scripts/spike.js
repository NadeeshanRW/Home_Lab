// =====================================================================
// SPIKE TEST
// =====================================================================
// What it does : Normal traffic -> SUDDEN huge jump -> hold -> sudden drop -> recovery.
// Why          : Simulates a flash sale, a viral post or a news mention.
//                Does the site survive, and does it recover afterwards?
// Run          : k6 run -e ENV=staging scripts/spike.js       (do NOT run on production)
//                k6 run -e ENV=staging -e SPIKE_USERS=1000 scripts/spike.js
// =====================================================================
import { ENDPOINTS, banner, guardProduction } from '../config/config.js';
import { get, think } from '../lib/helpers.js';

guardProduction('spike'); // blocks this test on production unless -e ALLOW_PROD=true

// ---------------------------------------------------------------------
// SETTINGS  (CHANGE HERE)
// ---------------------------------------------------------------------
const BASELINE_USERS = Number(__ENV.BASELINE_USERS) || 20;  // normal number of users
const SPIKE_USERS = Number(__ENV.SPIKE_USERS) || 500;       // users during the spike

const BASELINE_TIME = '1m';    // time at normal traffic before the spike
const SPIKE_RISE_TIME = '30s'; // how FAST the spike arrives (shorter = more violent)
const SPIKE_HOLD_TIME = '3m';  // how long the spike lasts
const SPIKE_DROP_TIME = '30s'; // how fast the users leave again
const RECOVERY_TIME = '3m';    // time at normal traffic after the spike (checks recovery)

const THINK_MIN_SECONDS = 1;
const THINK_MAX_SECONDS = 2;

const P95_MS = 3000;           // allowed response time during a spike (ms)
const MAX_ERROR_RATE = 0.10;   // 0.10 = up to 10% errors allowed during a spike

// ---------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------
export const options = {
  stages: [
    { duration: BASELINE_TIME, target: BASELINE_USERS },    // normal
    { duration: SPIKE_RISE_TIME, target: SPIKE_USERS },     // sudden spike
    { duration: SPIKE_HOLD_TIME, target: SPIKE_USERS },     // spike stays
    { duration: SPIKE_DROP_TIME, target: BASELINE_USERS },  // sudden drop
    { duration: RECOVERY_TIME, target: BASELINE_USERS },    // recovery check
    { duration: '30s', target: 0 },                         // finish
  ],
  thresholds: {
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export function setup() {
  banner('spike');
}

export default function () {
  get(ENDPOINTS.home);
  think(THINK_MIN_SECONDS, THINK_MAX_SECONDS);
}
