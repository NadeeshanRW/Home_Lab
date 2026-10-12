// lib/helpers.js
// Small shared helpers so the test scripts stay short and easy to read.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { url, HEADERS } from '../config/config.js';

// Sends a GET request to one of the ENDPOINTS from config.js and checks the result.
//   path     -> e.g. ENDPOINTS.home
//   maxMs    -> (optional) fail the check if the response is slower than this
export function get(path, maxMs) {
  const res = http.get(url(path), {
    headers: HEADERS,
    tags: { name: path }, // groups results per page in the k6 summary
  });

  const checks = {
    [`GET ${path} -> status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  };
  if (maxMs) {
    checks[`GET ${path} -> faster than ${maxMs}ms`] = (r) => r.timings.duration < maxMs;
  }
  check(res, checks);
  return res;
}

// Sends a POST request with a JSON body and checks for a 2xx status.
export function post(path, body) {
  const res = http.post(url(path), JSON.stringify(body), {
    headers: HEADERS,
    tags: { name: path },
  });
  check(res, {
    [`POST ${path} -> status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  return res;
}

// Pause like a real user reading the page: random time between min and max seconds.
export function think(minSeconds, maxSeconds) {
  sleep(minSeconds + Math.random() * (maxSeconds - minSeconds));
}
