// =====================================================================
// config/config.js  -  THE ONLY PLACE WHERE URLs ARE DEFINED
// =====================================================================
// Every test script reads its URLs from this file.
// To test a different site, change it here (or pass it on the command line).
//
// Pick an environment when you run a test:
//   k6 run scripts/smoke.js                               -> uses DEFAULT_ENV below
//   k6 run -e ENV=staging scripts/smoke.js                -> uses the "staging" URL
//   k6 run -e BASE_URL=https://x.com scripts/smoke.js     -> one-off URL, ignores the list
// =====================================================================

// ---------------------------------------------------------------------
// 1) ENVIRONMENTS  (CHANGE HERE: put your real site URLs)
// ---------------------------------------------------------------------
// No trailing slash at the end of the URL!
const ENVIRONMENTS = {
  demo:       { baseUrl: 'https://test.k6.io' },            // public k6 demo site (works out of the box)
  local:      { baseUrl: 'http://localhost:3000' },         // your laptop
  staging:    { baseUrl: 'https://staging.example.com' },   // CHANGE HERE: staging site
  production: { baseUrl: 'https://www.example.com' },      // CHANGE HERE: live site
};

// Which environment is used when you do NOT pass -e ENV=...
const DEFAULT_ENV = 'demo';

// ---------------------------------------------------------------------
// 2) ENDPOINTS  (CHANGE HERE: the pages / APIs you want to test)
// ---------------------------------------------------------------------
// Only the path part. The BASE_URL is added automatically.
export const ENDPOINTS = {
  home:     '/',               // main page
  contacts: '/contacts.php',   // another page
  news:     '/news.php',       // another page
  search:   '/news.php?q=test',// a search style request
  write:    '/api/items',      // CHANGE HERE: a POST endpoint (only used if ENABLE_WRITE_TEST is true)
};

// Set to true ONLY if the "write" endpoint above is real and safe to call many times.
// Never point this at a real payment / email / SMS endpoint.
// You can also turn it on from the command line: -e ENABLE_WRITE_TEST=true
export const ENABLE_WRITE_TEST = (__ENV.ENABLE_WRITE_TEST || 'false') === 'true';

// ---------------------------------------------------------------------
// 3) AUTH  (optional)
// ---------------------------------------------------------------------
// If your API needs a token:  k6 run -e AUTH_TOKEN=abc123 scripts/load.js
// Leave empty for public sites.
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

// =====================================================================
// Below this line: you normally do not need to edit anything.
// =====================================================================

export const ENV = __ENV.ENV || DEFAULT_ENV;

if (!__ENV.BASE_URL && !ENVIRONMENTS[ENV]) {
  throw new Error(
    `Unknown ENV "${ENV}". Valid values: ${Object.keys(ENVIRONMENTS).join(', ')}`
  );
}

// -e BASE_URL=... wins over the ENVIRONMENTS list
export const BASE_URL = __ENV.BASE_URL || ENVIRONMENTS[ENV].baseUrl;

// Builds the full URL:  url('/contacts.php') -> https://test.k6.io/contacts.php
export function url(path) {
  return `${BASE_URL}${path}`;
}

// Heavy tests (stress, spike, soak, breakpoint) can hurt a live site.
// They refuse to run against ENV=production unless you add: -e ALLOW_PROD=true
export function guardProduction(testName) {
  if (ENV === 'production' && __ENV.ALLOW_PROD !== 'true') {
    throw new Error(
      `${testName} test is blocked on production. ` +
      `Run it on staging, or add "-e ALLOW_PROD=true" if you really mean it.`
    );
  }
}

// Prints which site is being tested at the start of a run.
export function banner(testName) {
  console.log(`>>> ${testName.toUpperCase()} test | ENV=${ENV} | target=${BASE_URL}`);
}
