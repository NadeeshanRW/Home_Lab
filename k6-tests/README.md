# K6 Performance Test Suite

Smoke, load, stress, spike, soak, breakpoint and mixed (production-like) tests.
Only **k6** is needed. No Node.js or npm.
All URLs live in **one file**: `config/config.js`.

## Folder structure

```
k6-tests/
├── config/
│   └── config.js            # URLs per environment, endpoints, auth  <- EDIT THIS FIRST
├── lib/
│   └── helpers.js           # small shared helpers (get, post, think)
├── scripts/
│   ├── smoke.js             # 1 user, quick sanity check
│   ├── load.js              # normal expected traffic
│   ├── stress.js            # above normal, find the limit
│   ├── spike.js             # sudden traffic burst
│   ├── soak.js              # long endurance run
│   ├── breakpoint.js        # find maximum capacity
│   └── production-mixed.js  # browse + search + write at the same time
├── results/                 # put saved summary files here (optional)
└── README.md
```

## 1. Install k6

```bash
brew install k6            # macOS
choco install k6           # Windows
sudo apt-get install k6    # Linux (Debian/Ubuntu, after adding the k6 repo)
docker run --rm -i -v "$PWD":/work -w /work grafana/k6 run scripts/smoke.js   # Docker, no install
```

Check it works: `k6 version`

## 2. Set your URLs

Open `config/config.js` and edit:

| What | Where in the file |
|------|-------------------|
| Site URL for each environment | `ENVIRONMENTS` (staging, production, local) |
| Default environment | `DEFAULT_ENV` |
| Pages / API paths to test | `ENDPOINTS` |
| Turn the POST (write) test on | `ENABLE_WRITE_TEST` |

By default it points to the public demo site `https://test.k6.io`, so you can try everything immediately.

## 3. Run a test

Run these from inside the `k6-tests` folder:

```bash
k6 run scripts/smoke.js
k6 run scripts/load.js
k6 run scripts/stress.js
k6 run scripts/spike.js
k6 run scripts/soak.js
k6 run scripts/breakpoint.js
k6 run scripts/production-mixed.js
```

Choose the environment or URL (`-e` = environment variable):

```bash
k6 run -e ENV=staging scripts/load.js                    # staging URL from config.js
k6 run -e ENV=production scripts/load.js                 # production URL from config.js
k6 run -e BASE_URL=https://my-site.com scripts/load.js   # any URL, one time
```

Change settings without editing the file:

```bash
k6 run -e USERS=100 -e HOLD=20m scripts/load.js
k6 run -e ENV=staging -e USER_STEPS=100,200,400 scripts/stress.js
k6 run -e ENV=staging -e MAX_RATE=2000 scripts/breakpoint.js
k6 run -e ENV=staging -e SOAK_TIME=8h scripts/soak.js
k6 run -e AUTH_TOKEN=abc123 scripts/load.js              # API that needs a Bearer token
k6 run -e ENV=staging -e ENABLE_WRITE_TEST=true scripts/production-mixed.js
```

Save the result summary to a file:

```bash
k6 run --summary-export=results/load.json scripts/load.js
```

Windows tip: in PowerShell or cmd the same commands work as they are
(use `k6 run -e ENV=staging scripts\load.js`, slashes in either direction are fine).

## 4. Changing the numbers

Open the script you want. Near the top there is a block marked
`SETTINGS (CHANGE HERE)`. Every line has a comment explaining it:

| Setting | Meaning |
|---------|---------|
| `USERS` | how many virtual users at the same time |
| `DURATION`, `HOLD`, `RAMP_UP`, `RAMP_DOWN`, `SOAK_TIME` | how long each phase runs (`30s`, `5m`, `2h`) |
| `THINK_MIN_SECONDS` / `THINK_MAX_SECONDS` | pause between a user's requests |
| `PAGES` / the `get(...)` lines | which requests each user sends (more lines = more requests per loop) |
| `P95_MS`, `P99_MS` | speed targets: 95% / 99% of requests must be faster than this |
| `MAX_ERROR_RATE` | allowed share of failed requests (`0.01` = 1%) |
| `START_RATE`, `MAX_RATE` (breakpoint) | requests per second at the start and end |
| `WRITE_RATE` (mixed) | POST requests per second |

Rough idea of the request count: `users x requests per loop / seconds per loop`.
More users, less think time, or more `get()` lines = more requests.

If a test **fails** at the end (`thresholds ... crossed`), it means a speed or error target above was missed. That is the useful result.

## 5. Recommended order

1. **smoke** - are the script and site OK?
2. **load** - does normal traffic meet the speed targets?
3. **stress** - where does it start to struggle?
4. **spike** - does it survive a sudden burst and recover?
5. **breakpoint** - what is the maximum capacity?
6. **soak** - is it stable for hours? (watch server memory/CPU)
7. **mixed** - realistic combination of user types

## 6. Production safety

- `stress`, `spike`, `soak` and `breakpoint` **refuse to run** when `ENV=production`.
  Override only if you are sure: `-e ALLOW_PROD=true`.
- Tell your team before testing a live site, and prefer off-peak hours.
- Never point the write test at real payment, email or SMS endpoints.
- Use test accounts and test data, never real customer data.
- Prefer staging for anything heavy.

## 7. Dashboards (optional)

```bash
# Grafana + InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 scripts/load.js

# Prometheus remote write
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
k6 run -o experimental-prometheus-rw scripts/load.js
```
