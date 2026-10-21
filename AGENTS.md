# Relay / Credit Routing Prototype — Codex Instructions

## Product goal
Build a mobile-first prototype that tests this core hypothesis:

> Given Card A, Card B, and an amount, determine whether a simulated eligible route exists, compare approved-style alternatives, and recommend the lowest-cost eligible option.

## Stack
- Mobile: Expo + React Native + TypeScript
- Backend: FastAPI + Python
- Data: mock data only in the prototype

## Safety and product boundaries
- Never collect or store real full card numbers, CVV, PIN, OTP, bank passwords, or live payment credentials.
- Do not implement real money movement.
- Do not represent a Card A -> Card B route as universally supported by banks or networks.
- Card-to-card eligibility rules in this repository are simulated product logic until validated with issuers/networks/payment partners.
- Do not build fake merchant transactions, cash cycling, or any mechanism intended to bypass issuer/network rules.
- Clearly label financial calculations and routes as simulations.

## Engineering rules
- Keep frontend and backend separated under `mobile/` and `backend/`.
- Use reusable TypeScript components and typed API responses.
- Keep business logic in backend services rather than duplicating it in UI code.
- Do not hardcode duplicate card data in multiple places when a backend source exists.
- Preserve working functionality unless the task explicitly replaces it.
- Add or update tests for important routing/optimization logic.
- Before completing a task, run the relevant lint/type/test commands and report failures honestly.

## Git workflow
- Never develop directly on `main`.
- Use one feature branch per scoped task.
- Keep commits focused and descriptive.
- Open a pull request into `main` after checks pass.

## Initial product flow
1. Portfolio dashboard
2. Select source card
3. Select destination card
4. Enter amount
5. Run eligibility checks
6. Compare simulated routes:
   - card-to-card if eligible
   - balance transfer
   - normal repayment
   - refinancing
7. Recommend the lowest-cost eligible route
8. Show a simulated transaction/result state

## Definition of done
A task is complete only when:
- the requested flow works end to end,
- mock/simulation labels remain visible,
- no sensitive payment credential collection is introduced,
- relevant checks/tests pass or remaining failures are documented,
- changed files and run instructions are summarized in the PR.
