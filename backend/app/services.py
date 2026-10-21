"""Simulated eligibility and economics; never payment execution."""
from fastapi import HTTPException
from .data import CARDS
from .models import Card, EligibilityCheck, EligibilityRequest, RouteQuote

def get_card(card_id: str) -> Card:
    for card in CARDS:
        if card.id == card_id:
            return card
    raise HTTPException(status_code=404, detail="Card not found")


def card_route_checks(source: Card, destination: Card, amount: float) -> list[EligibilityCheck]:
    return [
        EligibilityCheck(
            key="different_cards",
            label="Different source and destination",
            passed=source.id != destination.id,
            message="Source and destination must be different cards.",
        ),
        EligibilityCheck(
            key="source_enabled",
            label="Source-card program eligibility",
            passed=source.source_route_enabled,
            message=(
                f"{source.issuer} mock route program is enabled."
                if source.source_route_enabled
                else f"{source.issuer} mock route program is not enabled."
            ),
        ),
        EligibilityCheck(
            key="destination_enabled",
            label="Destination can receive this route",
            passed=destination.destination_route_enabled,
            message=(
                f"{destination.issuer} mock destination route is enabled."
                if destination.destination_route_enabled
                else f"{destination.issuer} mock destination route is not enabled."
            ),
        ),
        EligibilityCheck(
            key="available_limit",
            label="Available source limit",
            passed=source.available_limit >= amount,
            message=f"Available limit: ₹{source.available_limit:,.0f}.",
        ),
        EligibilityCheck(
            key="destination_outstanding",
            label="Amount does not exceed destination outstanding",
            passed=destination.outstanding >= amount,
            message=f"Destination outstanding: ₹{destination.outstanding:,.0f}.",
        ),
        EligibilityCheck(
            key="prototype_limit",
            label="Prototype route limit",
            passed=amount <= 25000,
            message="Prototype Card-to-Card routes are capped at ₹25,000.",
        ),
    ]


def build_quotes(source: Card, destination: Card, amount: float) -> list[RouteQuote]:
    checks = card_route_checks(source, destination, amount)
    card_eligible = all(check.passed for check in checks)

    # Mock economics for product demonstration only.
    card_fee = round(amount * 0.0125, 2)
    bt_fee = round(amount * 0.02, 2)
    refinance_fee = round(amount * 0.01, 2)

    return [
        RouteQuote(
            route="card_to_card",
            label="Eligible Card-to-Card Route",
            eligible=card_eligible,
            processing_fee=card_fee,
            estimated_interest=0,
            total_cost=amount + card_fee,
            amount=amount,
            explanation=(
                "Mock approved route available after all eligibility checks."
                if card_eligible
                else "At least one eligibility check failed; use an alternative route."
            ),
        ),
        RouteQuote(
            route="balance_transfer",
            label="Balance Transfer",
            eligible=amount <= 60000,
            processing_fee=bt_fee,
            estimated_interest=round(amount * 0.015, 2),
            total_cost=amount + bt_fee + round(amount * 0.015, 2),
            amount=amount,
            explanation="Mock 6-month promotional balance-transfer offer.",
        ),
        RouteQuote(
            route="normal_repayment",
            label="Normal Repayment",
            eligible=True,
            processing_fee=0,
            estimated_interest=round(amount * 0.035, 2),
            total_cost=amount + round(amount * 0.035, 2),
            amount=amount,
            explanation="Illustrative cost if the balance is carried instead of fully paid on time.",
        ),
        RouteQuote(
            route="refinancing",
            label="Refinancing",
            eligible=amount >= 5000,
            processing_fee=refinance_fee,
            estimated_interest=round(amount * 0.022, 2),
            total_cost=amount + refinance_fee + round(amount * 0.022, 2),
            amount=amount,
            explanation="Mock regulated-lender refinancing quote for comparison.",
        ),
    ]


def portfolio():
    total_limit = sum(c.credit_limit for c in CARDS)
    outstanding = sum(c.outstanding for c in CARDS)
    available = sum(c.available_limit for c in CARDS)
    utilization = round((outstanding / total_limit) * 100, 2) if total_limit else 0
    next_due = sorted(CARDS, key=lambda c: c.due_date)[0]
    return {
        "total_limit": total_limit,
        "total_outstanding": outstanding,
        "available_credit": available,
        "utilization": utilization,
        "next_due": next_due.model_dump(),
    }


def optimize(req: EligibilityRequest):
    source = get_card(req.source_card_id)
    destination = get_card(req.destination_card_id)
    checks = card_route_checks(source, destination, req.amount)
    quotes = build_quotes(source, destination, req.amount)
    eligible_quotes = [q for q in quotes if q.eligible]
    recommendation = min(eligible_quotes, key=lambda q: q.total_cost)

    return {
        "source": source.model_dump(),
        "destination": destination.model_dump(),
        "amount": req.amount,
        "checks": [check.model_dump() for check in checks],
        "quotes": [quote.model_dump() for quote in quotes],
        "recommendation": recommendation.model_dump(),
        "disclaimer": "Prototype simulation only. No real financial transaction is executed.",
    }
