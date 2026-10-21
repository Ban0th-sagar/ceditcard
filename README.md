# Relay — Premium mobile credit routing prototype

Expo + React Native + TypeScript UI and a FastAPI backend. All cards, eligibility
policies, fees, interest, and recommendations are **mock simulations**. Issuer
names identify fictional demo cards and imply no issuer/network support. No
payments, bank connections, sensitive credentials, or money movement exist.

## Features

- Four mock cards; portfolio outstanding, available credit, utilization, and next due card.
- Source/destination selection and amount validation.
- Six summary checks plus full per-route details, with intentionally eligible and ineligible combinations.
- Four illustrative routes: Card-to-Card, balance transfer, normal repayment, refinancing.
- Lowest-total-cost eligible recommendation and a simulation-complete result screen.

`backend/app/data.py` is the single mock portfolio source. Pydantic models live
in `backend/app/models.py` and `backend/app/routing_models.py`, routing/quote
logic in `backend/app/routing.py`, compatibility adapters in
`backend/app/services.py`, and HTTP routes in `backend/app/main.py`. The mobile app uses typed API responses and
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

The 65 Python tests cover portfolio totals, eligible/ineligible routes, six
checks, amount/route limits, unknown cards, and lowest-cost selection. The 23
Playwright tests preserve the acceptance demo at a phone viewport and cover
the original five endpoints plus quote/capabilities, invalid HTTP inputs, amount
feedback, all tabs/card details, backend rationale, route details/blockers,
session activity, and error/empty-state recovery. No separate lint script is configured.

## Acceptance demo (issue #1)

1. Open the dashboard and inspect the four mock cards and next-due summary.
2. Tap **Optimize My Credit**. Source defaults to **ICICI Amazon Pay**, destination
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

## Phase 2 UI (issue #3)

Five persistent bottom tabs — Home, Cards, Optimize, Activity, Profile — use an
original ink/slate, citron, and sea-glass design. Optimize is the highlighted
center action. Shared tokens and primitives live in `mobile/src/theme.ts` and
`mobile/src/components/UI.tsx`; screen composition is in `mobile/src/screens/`.
No new runtime dependencies or backend changes are required. Run commands above
are unchanged.

- Home: demo-user greeting, API portfolio metrics, next due card, four tappable
  cards, API-derived bill schedule, and an illustrative portfolio insight.
- Cards: all card metrics plus detailed masked card faces, utilization meters,
  due dates, minimum dues, and explicitly simulated recent activity.
- Optimize: source/destination choices, amount, six checks, four quotes, and an
  expandable **Why this recommendation?** explaining the API-selected route.
- Activity: actual optimization checks from the current session, plus labeled
  illustrative history. History resets on reload; it never records a payment.
- Profile: demo identity, Simulation Mode, integration/credential boundaries,
  product and version.

For the Phase 2 demo, inspect Home, open each bottom tab, and open a card from
Cards. Use **Optimize My Credit**, run the Phase 1 acceptance demo above, and
expand **Why this recommendation?**. Rerun with Axis as source, then open Activity
to see the passing and ineligible checks. Profile explains simulation mode.
Loading, network-failure retry, and empty-card refresh states are included.
Native Android/iOS rendering remains unverified; automated UI validation uses
a Chromium browser at a 390 × 844 viewport.

## Phase 3 routing transparency (issue #5)

Optimize now requests `POST /api/routes/quote` through typed mobile contracts.
All four routes include status, stable blocking codes, checks, cost components,
processing-time labels, and backend-authored trade-offs. Open each route's
**View … details** action to inspect all rules, assumptions, and disclaimers.
**Why this recommendation?** renders the backend rationale verbatim. Home,
Cards, Activity, and Profile retain the Phase 2 design and navigation.

See [API and architecture](docs/routing-api.md) for schemas, rule codes,
provider boundary, rounding policy, legacy endpoint compatibility, and previews.
Run instructions above are unchanged; restart the API after backend changes.
There are no new dependencies. Existing Phase 1/2 tests remain unchanged; five
new browser tests cover the quote contract, errors, all four route details,
backend rationale, blockers, fallbacks, and same-card feedback. Eighteen new
Python tests cover the central routing rules and recommendation behavior.

Repeat the passing and Axis demos above, open each route's details, then select
the same source/destination to see four blocked routes and no recommendation.
Zero/negative amounts are rejected in the UI and API; amounts above the
destination balance return blocked quotes. No payment can be submitted.

Preview screenshots: [Recommendation](docs/previews/phase3-recommendation.png),
[Comparison](docs/previews/phase3-routing.png),
[Details](docs/previews/phase3-details.png). These are screenshots of the tested
mobile web app, not a public deployment. Native Android/iOS builds remain
unverified.

## Phase 4 transaction simulator (issue #7)

From an eligible route card, choose **Select …**, review confirmation, and press
**Simulate Route**. The backend re-quotes using the Phase 3 engine, rejects
ineligible routes or client-supplied quote fields, and stores an authoritative
snapshot. Use **Advance simulation** to follow the local timeline through
`CREATED → ELIGIBILITY_CHECK → ELIGIBLE → AUTHORIZED → PROCESSING → SIMULATED_SETTLED`.
Every transaction screen explicitly shows Simulation Mode, No money moved, and
No bank/network/issuer integration. Mock card balances never change.

**Cancel simulation** is available before processing. **Fail at processing demo**
on confirmation gives a deterministic `FAILED` result. A changed backend mock
rule can produce `INELIGIBLE` during recheck. Activity now includes server-backed
transaction records with reopenable timelines alongside session quote events
and clearly labeled illustrative history.

See [Transaction API, state machine, architecture and demos](docs/transaction-simulator.md).
All five transaction endpoints have typed contracts. Use the same install/build/
test commands above: no new dependencies or services are required. Start one API
worker; in-memory transaction history survives browser reloads but resets on API
restart. This remains an unauthenticated local prototype, never a payment system.

There are 19 new Python transaction tests and six new browser tests; existing
Phase 1–3 test files and the routing engine are unchanged. Native Android/iOS
builds remain unverified.

## Phase 5 fictional offer Marketplace (issue #9)

Open **Explore fictional Marketplace** from Home or **Open Marketplace** from
Optimize. Choose the HDFC-like destination, enter ₹20,000, and compare. Cedar
and Birch fictional balance-transfer offers are eligible at ₹20,300/₹20,600;
Cedar ranks first by total repayment. Inspect **Why this offer?** and
**Offer Details**, select Cedar, and use the existing **Simulate Route** flow.
Activity/timeline retains its offer ID, provider, tenure and full quote snapshot.

Switch to **Refinancing offers** for tenure/monthly comparisons, an intentionally
ineligible offer and an inactive offer. Default tenure is declared per offer;
an explicit tenure re-evaluates eligibility/ranking. Lower monthly payment can
mean longer repayment time. Compare total repayment, not only monthly amount.
The single-cycle comparison baseline and its horizon mismatch are visible;
negative savings are shown and no savings are guaranteed.

All seven offers/providers and prices are fictional. Ranking never uses partner
payout. Eligibility, Decimal costs, monthly estimates, savings and rationale are
backend-owned. Selecting an offer reuses the Phase 3 quote API, then Phase 4
revalidates current offer eligibility/pricing before transaction creation.
Inactive, expired, ineligible and unknown offers cannot be simulated. No real
application, KYC, bureau pull, credentials or payments are implemented.

See [Marketplace APIs, calculations, ranking and integration](docs/offer-marketplace.md).
New APIs: `GET /api/offers`, `POST /api/offers/quote`, `GET /api/offers/{id}`.
Run instructions are unchanged and no dependencies were added. Existing
Phase 1–4 test files remain unchanged; 19 new Python and six new Playwright tests
cover offer rules, paise rounding, neutral ranking, route integration,
revalidation, details, protection cases and simulated settlement/Activity.
