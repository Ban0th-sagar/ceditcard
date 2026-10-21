# Phase 5 fictional offer marketplace

All provider names, offers, terms, and prices are invented demo data. Nothing
connects to a bank, lender, bureau, issuer, network, or financial account. No
application, KYC, bureau pull, credentials, or money movement is implemented.

## Architecture

- `offer_models.py`: typed catalog, criteria/check/reason, quote, baseline,
  ranking and route-reference contracts. Catalog pricing is not client input.
- `offer_catalog.py`: seven invented offers: three balance transfers and four
  refinancing offers, including an intentionally inactive cheaper offer.
- `offers.py`: eligibility, Decimal costs, monthly estimates, signed illustrative
  savings, cost-only rankings/rationale, route references and quote projection.
- `costing.py`: shared paise arithmetic and the existing Normal Repayment
  baseline rate. Phase 3 providers use the same helper; their economics remain
  unchanged. `routing.rank_routes` is reused after applying a selected offer.
- `offers_api.py`: three typed API adapters. There are no new dependencies or
  external integrations.
- Mobile types/API methods, reusable `OfferEconomics`, and `MarketplaceScreen`
  compose the Phase 2 dark design with balance-transfer/refinancing filters,
  input controls, backend-ranked eligible offers, blocked/inactive separation,
  Offer Details and responsible-credit copy. Financial calculations/ranking are
  never reproduced in mobile.

The destination, its utilization/outstanding, and total portfolio outstanding
(exposure) are resolved from backend mock data. Client exposure, eligibility,
pricing and partner-payout fields are rejected by the offer quote contract.

## API

| Method/path | Result |
| --- | --- |
| `GET /api/offers` | Full fictional catalog, including inactive entries |
| `POST /api/offers/quote` | All eligible/ineligible quotes, checks, costs, ranks, rationale and baseline |
| `GET /api/offers/{id}` | Catalog metadata for one fictional offer; unknown ID returns 404 `OFFER_NOT_FOUND` |

Example:

```json
{"destination_card_id":"hdfc_regalia","amount":20000,"tenure_months":null}
```

An omitted/null tenure uses each offer's declared default. An explicit tenure
is evaluated for every offer; unsupported ones are returned as ineligible.
The response includes destination snapshot, amount, server portfolio exposure,
quotes, best offer IDs per type, baseline, responsible-credit copy and disclaimer.
Each quote contains its full catalog snapshot, tenure, eligibility checks,
blocking codes, fee, interest, total, monthly/final estimates, signed savings,
rank and backend explanation. Blocked estimates are illustrative, never selectable.
Amounts must be positive finite numbers in paise increments, at most ₹1 billion;
tenures must be positive integer months (at most 120).

Stable blocking codes:

| Code | Rule |
| --- | --- |
| `OFFER_INACTIVE` | Inactive fictional offer |
| `OFFER_EXPIRED` | Expiry date is before the current server date |
| `BELOW_OFFER_MINIMUM` / `ABOVE_OFFER_MAXIMUM` | Amount outside catalog range |
| `OFFER_EXCEEDS_OUTSTANDING` | Destination balance cannot cover amount |
| `OFFER_DESTINATION_DISABLED` | Destination receipt is disabled |
| `UTILIZATION_TOO_HIGH` | Destination's mock utilization exceeds offer ceiling |
| `PORTFOLIO_EXPOSURE_TOO_LOW` / `PORTFOLIO_EXPOSURE_TOO_HIGH` | Backend exposure outside offer limits |
| `UNSUPPORTED_TENURE` | Selected tenure not supported by that offer |

Bad amounts/malformed or extra fields use HTTP 422 `INVALID_AMOUNT` or
`INVALID_REQUEST`; unknown cards use HTTP 404 `CARD_NOT_FOUND`. Unknown offers
never silently fall back to another quote.

## Calculation and fair ranking

All terms are fictional. Pricing uses **flat simple interest**, not a real
reducing-balance APR or a lender EMI formula:

- fee = principal × catalog fee rate, rounded half-up to paise;
- interest = principal × fictional annual flat rate × months / 12, rounded
  half-up to paise;
- total = principal + rounded fee + rounded interest;
- monthly estimate = total / months, rounded down to paise;
- final installment = total − monthly estimate × (months − 1), absorbing rounding.

The monthly/final schedule sums exactly to the modeled total, including fees.
The baseline is the **existing Phase 3 Normal Repayment single-cycle 3.5%
carried-balance illustration**. It is explicitly not a tenure-matched loan or
interest-free full repayment. Savings = baseline total − offer total, and can
be negative. The UI exposes this horizon mismatch; savings are not guaranteed.

Ranking is per offer type for the evaluated/default tenures: eligible quotes
sort by `(total repayment, processing days, fee, stable offer ID)`. Ineligible,
inactive and expired offers have no rank. No commission/payout attribute exists
in the catalog or ranking input. Rank explanations come from the backend,
including cost difference to the first-ranked offer and the tie-break policy.

Lower monthly payment can mean longer repayment time. Compare total repayment,
not only EMI/monthly amount. All results are simulations, not financial advice
or approval. No debt cycling is encouraged or implemented.

## Phase 3 integration

Ordinary `/api/routes/quote` requests preserve the four existing route estimates
and recommendation behavior. Added `marketplace_offers` references identify the
best eligible offer for each alternative type. Route cards distinguish the
prototype estimate from the separate best fictional marketplace total and
provide matching Marketplace actions.

A selected offer can be evaluated through the same route API:

```json
{
  "source_card_id":"icici_amazon",
  "destination_card_id":"hdfc_regalia",
  "amount":20000,
  "offer_id":"cedar_transfer",
  "offer_tenure_months":6
}
```

The backend applies the freshly calculated offer to its matching route and
re-ranks with the shared route ranking function. `selected_offer` carries its
quote snapshot. Card-to-Card and Normal Repayment pricing/rules are unchanged.
Mobile selects this backend response rather than creating price overrides.
The Phase 3 source/destination rules still apply to eventual simulation.

## Phase 4 integration and integrity

`POST /api/transactions` accepts optional `offer_id` and
`offer_tenure_months` alongside the existing card IDs, amount, route ID and demo
outcome. A tenure without an offer is rejected. The backend:

1. Re-evaluates the Phase 3 route and the selected catalog offer.
2. Rejects unknown, blocked/inactive/expired or route-mismatched offers with
   `OFFER_NOT_FOUND`, `OFFER_INELIGIBLE`, or `OFFER_ROUTE_MISMATCH`.
3. Uses current server prices with no client-provided overrides (extra
   price/eligibility/snapshot fields are rejected).
4. Stores resolved offer ID/tenure and the complete `offer_quote_snapshot`, plus
   the authoritative route/cost snapshot.
5. Rechecks offer eligibility again at `ELIGIBILITY_CHECK`. Changes can terminate
   as `INELIGIBLE`; a removed offer uses `OFFER_NO_LONGER_AVAILABLE`.

The creation snapshot and agreed simulated costs remain intact even when a
later check differs; `latest_offer_snapshot` records the new check separately.
The existing success/failure/cancel state machine and atomic repository are
reused. Timeline and Activity include the fictional provider/offer context.
No external application is submitted. Storage remains single-process memory
and resets on API restart; browser reloads can reopen server-held history.

## Demo and validation

Home **Explore fictional Marketplace** or Optimize **Open Marketplace** opens
comparison. Select the HDFC-like destination and enter ₹20,000, then compare.
Cedar and Birch are eligible at ₹20,300 and ₹20,600, ranked 1 and 2. Cedar's
baseline is ₹20,700 with ₹400 illustrative savings. Ember requires ₹25,000 and
is blocked at this amount. Inspect **Why this offer?** and **Offer Details**.
Select Cedar, confirm **Simulate Route**, advance through the five existing
steps to `SIMULATED_SETTLED`, then reopen it in Activity.

Switch to Refinancing at ₹10,000. Quartz (6 months, ₹10,400 total) and Lumen
(12 months, ₹10,475 total) demonstrate the monthly/total trade-off and negative
savings against the ₹10,350 single-cycle baseline. Moss has explicit mock
utilization/exposure constraints and minimum amount; Paper is inactive and
never selectable/ranked. Selecting 12 months re-evaluates all offers and ranks
eligible Lumen ahead of Quartz for that tenure.

Use the unchanged README install/run/check commands. No dependencies were added.
The suite includes 65 Python tests (46 unchanged plus 19 offer cases) and 23
Playwright tests (17 unchanged plus six marketplace/API/selection cases), plus
TypeScript, Expo web build and whitespace checks. Native Android/iOS builds
remain unverified; browser UI checks use the mobile viewport.
