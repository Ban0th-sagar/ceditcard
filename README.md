# Relay — Credit Routing Prototype

A mobile-first prototype for testing the startup's core hypothesis:

> Given Card A, Card B, and an amount, determine whether a mock eligible route exists, compare alternatives, and recommend the lowest-cost eligible route.

## What works in Phase 1

- Portfolio dashboard with 4 mock credit cards
- Dynamic portfolio totals
- Source card + destination card selection
- Amount input
- Mock Card-to-Card eligibility checks
- Some card combinations intentionally pass and others fail
- Comparison of Card-to-Card, Balance Transfer, Normal Repayment, and Refinancing
- Lowest-cost eligible route recommendation
- No real card data and no real money movement

## Project structure

```text
ceditcard/
  mobile/     Expo + React Native + TypeScript
  backend/    FastAPI + Python
```

## Start the backend (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Test:

- http://127.0.0.1:8000/api/health
- http://127.0.0.1:8000/docs

## Start the mobile app

Open a second terminal:

```powershell
cd mobile
npm install
npx expo start
```

### API URL

Edit `mobile/src/api.ts` depending on where you run Expo:

- Web / iOS simulator: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical phone: use your laptop's LAN IP, for example `http://192.168.1.5:8000`

For a physical phone, make sure the phone and laptop are on the same Wi-Fi network and the firewall allows port 8000.

## Recommended demo

1. Open Relay dashboard.
2. Tap **Optimize my credit**.
3. Source: **ICICI Amazon Pay**.
4. Destination: **HDFC Regalia**.
5. Amount: **₹10,000**.
6. Tap **Check eligibility & optimize**.
7. Review all six eligibility checks.
8. Compare the four possible routes.
9. Show Relay's recommended route.
10. Change the source to HDFC or Axis to demonstrate an intentionally failed Card-to-Card route and fallback alternatives.

## Safety / product boundary

This repository is a product simulation. It does not:

- process payments
- connect to a bank or card network
- collect full card numbers
- collect CVV/PIN/OTP
- provide financial advice

Real-world financial execution must only be added after issuer/network/payment-partner validation and the required regulatory/compliance work.
