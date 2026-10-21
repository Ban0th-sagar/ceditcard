# Relay — Phase 1 credit routing prototype

Expo + React Native + TypeScript UI and a FastAPI backend. All cards, eligibility
policies, fees, interest, and recommendations are **mock simulations**. Issuer
names identify fictional demo cards and imply no issuer/network support. No
payments, bank connections, sensitive credentials, or money movement exist.

## Features

- Four mock cards; portfolio outstanding, available credit, utilization, and next due card.
- Source/destination selection and amount validation.
- Six simulated Card-to-Card checks, with intentionally eligible and ineligible combinations.
- Four illustrative routes: Card-to-Card, balance transfer, normal repayment, refinancing.
- Lowest-total-cost eligible recommendation and a simulation-complete result screen.

`backend/app/data.py` is the single mock portfolio source. Pydantic models live
in `backend/app/models.py`, routing/quote logic in `backend/app/services.py`, and
HTTP routes in `backend/app/main.py`. The mobile app uses typed API responses and
reusable card/stat components; it does not duplicate financial rules or data.

## Prerequisites

Python 3.12+ and Node.js 22+ with npm (validated on Python 3.12 and Node 24).
No external database, API key, bank account, or Expo login is needed for web.
Run the following commands from the checkout root unless stated otherwise.

## Install and run web + API (Linux/macOS)

```bash
python -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd mobile
npm ci
npm run typecheck
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm run build:web
cd ../backend
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend serves the exported web app and API together on port 8000. Open
`http://127.0.0.1:8000` on your own machine. API docs are at `/docs` and health is
at `/api/health`. Rebuild frontend changes and restart the backend to refresh
the exported app. Start the backend after the export so it mounts the web app.

On cloud machines with a read-only home directory, set
`export npm_config_cache=/tmp/relay-npm-cache` before npm commands and use
`--cache-dir /tmp/relay-pip-cache` with pip. `EXPO_OFFLINE=1` avoids Expo's online
compatibility-metadata request; npm still downloads packages with normal
integrity/TLS verification. This flag is optional when Expo's API is reachable.

### Windows PowerShell

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd mobile
npm ci
npm run typecheck
$env:EXPO_OFFLINE="1"
$env:EXPO_NO_TELEMETRY="1"
npm run build:web
cd ../backend
.venv/Scripts/python.exe -m unittest discover -s tests -v
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Live Expo development / phone

Keep the backend running. In a second terminal, from `mobile/`, set the API
origin **before** starting Expo:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npm run web
# For Expo Go, use a backend address reachable from your phone:
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000 npm start
```

Replace the LAN IP with your development machine's address; allow port 8000
through its firewall and use the same Wi-Fi. Android emulators typically use
`http://10.0.2.2:8000`; iOS simulators use `http://127.0.0.1:8000`. In PowerShell,
set `$env:EXPO_PUBLIC_API_URL="http://<reachable-host>:8000"` then `npm start`.
Use an Expo Go/development client compatible with SDK 57. Native compilation
requires the corresponding Android/iOS SDK and is not validated by web tests.

Exported web defaults to a same-origin API. Rebuild after changing
`EXPO_PUBLIC_API_URL`; it is embedded in the client. Never put secrets in
`EXPO_PUBLIC_*` variables. No source edit is needed to change the API address.

## Checks

From `backend/`:

```bash
.venv/bin/python -m unittest discover -s tests -v
```

From `mobile/`, with the exported app/API running on port 8000:

```bash
npm run typecheck
npx playwright install chromium  # once, if no browser is installed
npm run test:e2e
# Alternatively use system Chromium on Linux:
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

The nine Python tests cover portfolio totals, eligible/ineligible routes, six
checks, amount/route limits, unknown cards, and lowest-cost selection. The three
Playwright tests cover the acceptance demo at a phone viewport, all five API
endpoints and invalid HTTP inputs, and invalid amount feedback. No separate
lint script is configured.

## Acceptance demo (issue #1)

1. Open the dashboard and inspect the four mock cards and next-due summary.
2. Tap **Optimize my credit**. Source defaults to **ICICI Amazon Pay**, destination
   to **HDFC Regalia**; amount defaults to **₹10,000**.
3. Tap **Check eligibility & optimize**. All six checks pass; all four quotes
   appear. Card-to-Card is recommended with a simulated total of **₹10,125**.
4. Tap **Change route**, choose **Axis ACE** as source, and rerun. The source
   program check fails, Card-to-Card is unavailable, and fallback routes remain
   visible. Refinancing is recommended with a simulated total of **₹10,320**.
5. Return to the portfolio. No transaction was executed or persisted.

## Prototype limits

Data is static, in memory, and not tied to real accounts. The next due card is
the earliest mock due date. The normal-repayment quote illustrates carrying a
balance rather than interest-free full repayment; all prices are illustrative,
not validated offers or financial advice. There is no authentication,
persistence, transaction submission, or real issuer/network integration.
