"""Simulated eligibility and economics; never payment execution."""

from fastapi import HTTPException
from .data import CARDS
from .routing import card_checks, quote_routes
from .models import Card, EligibilityCheck, EligibilityRequest, RouteQuote


def get_card(card_id: str) -> Card:
    for card in CARDS:
        if card.id == card_id:
            return card
    raise HTTPException(status_code=404, detail="Card not found")


def card_route_checks(
    source: Card, destination: Card, amount: float
) -> list[EligibilityCheck]:
    # Retain the six original checks and their order for legacy consumers.
    return [
        EligibilityCheck(**check.model_dump())
        for check in card_checks(source, destination, amount)[:6]
    ]


def build_quotes(source: Card, destination: Card, amount: float) -> list[RouteQuote]:
    # Old endpoints retain permissive fallback semantics, but share all rates,
    # calculations and rule definitions with the new engine.
    response = quote_routes(source, destination, amount, legacy=True)
    return [
        RouteQuote(
            route=route.id,
            label=route.display_name,
            eligible=route.eligible,
            processing_fee=route.estimated_fee,
            estimated_interest=route.estimated_interest,
            total_cost=route.estimated_total_cost,
            amount=amount,
            explanation=route.explanation,
        )
        for route in response.routes
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
