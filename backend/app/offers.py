"""Central fictional eligibility, pricing, cost-only ranking and route adapter."""

from datetime import date
from decimal import Decimal, ROUND_DOWN
from fastapi import HTTPException
from .costing import NORMAL_REPAYMENT_RATE, cost_components, paise
from .data import CARDS
from .offer_catalog import CATALOG
from .offer_models import (
    ComparisonBaseline,
    Offer,
    OfferBlockingReason,
    OfferCheck,
    OfferQuote,
    OfferQuoteRequest,
    OfferQuoteResponse,
    OfferReference,
)


def get_offer(offer_id: str) -> Offer:
    offer = CATALOG.get(offer_id)
    if offer is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "OFFER_NOT_FOUND", "message": "Fictional offer not found."},
        )
    return offer.model_copy(deep=True)


def list_offers() -> list[Offer]:
    return [get_offer(id) for id in CATALOG]


def evaluate(
    offer: Offer, destination, amount: float, tenure: int, exposure: float
) -> OfferQuote:
    tests = [
        (
            "OFFER_INACTIVE",
            "Active offer",
            offer.active,
            "This fictional offer must be active.",
        ),
        (
            "OFFER_EXPIRED",
            "Unexpired offer",
            offer.expires_on >= date.today(),
            f"Mock expiry: {offer.expires_on}.",
        ),
        (
            "BELOW_OFFER_MINIMUM",
            "Minimum amount",
            amount >= offer.minimum_amount,
            f"Minimum demo amount: ₹{offer.minimum_amount:,.2f}.",
        ),
        (
            "ABOVE_OFFER_MAXIMUM",
            "Maximum amount",
            amount <= offer.maximum_amount,
            f"Maximum demo amount: ₹{offer.maximum_amount:,.2f}.",
        ),
        (
            "OFFER_EXCEEDS_OUTSTANDING",
            "Destination outstanding",
            amount <= destination.outstanding,
            f"Destination mock outstanding: ₹{destination.outstanding:,.2f}.",
        ),
        (
            "OFFER_DESTINATION_DISABLED",
            "Receiving destination",
            destination.destination_route_enabled,
            "Destination must receive simulated repayment.",
        ),
        (
            "UTILIZATION_TOO_HIGH",
            "Mock utilization ceiling",
            destination.utilization <= offer.maximum_utilization,
            f"Mock utilization must be at most {offer.maximum_utilization}%.",
        ),
        (
            "PORTFOLIO_EXPOSURE_TOO_LOW",
            "Mock minimum exposure",
            exposure >= offer.minimum_portfolio_exposure,
            f"Mock portfolio exposure must be at least ₹{offer.minimum_portfolio_exposure:,.2f}.",
        ),
        (
            "PORTFOLIO_EXPOSURE_TOO_HIGH",
            "Mock maximum exposure",
            exposure <= offer.maximum_portfolio_exposure,
            f"Mock portfolio exposure must be at most ₹{offer.maximum_portfolio_exposure:,.2f}.",
        ),
        (
            "UNSUPPORTED_TENURE",
            "Supported tenure",
            tenure in offer.tenure_options,
            f"Supported demo tenures: {offer.tenure_options} months.",
        ),
    ]
    checks = [
        OfferCheck(code=code, label=label, passed=passed, message=message)
        for code, label, passed, message in tests
    ]
    # All amounts are indicative for blocked offers too; never actionable.
    interest_rate = Decimal(str(offer.annual_flat_rate)) * Decimal(tenure) / Decimal(12)
    fee, interest, total = cost_components(
        amount, str(offer.processing_fee_rate), str(interest_rate)
    )
    monthly = (Decimal(str(total)) / Decimal(tenure)).quantize(
        Decimal("0.01"), rounding=ROUND_DOWN
    )
    final = paise(Decimal(str(total)) - monthly * (tenure - 1))
    baseline = ComparisonBaseline(
        estimated_total_cost=cost_components(amount, "0", NORMAL_REPAYMENT_RATE)[2]
    )
    reasons = [
        OfferBlockingReason(code=check.code, message=check.message)
        for check in checks
        if not check.passed
    ]
    return OfferQuote(
        offer=offer,
        destination_card_id=destination.id,
        amount=amount,
        tenure_months=tenure,
        eligible=not reasons,
        checks=checks,
        blocking_reasons=reasons,
        estimated_fee=fee,
        estimated_interest=interest,
        estimated_total_cost=total,
        monthly_payment_estimate=float(monthly),
        final_payment_estimate=float(final),
        baseline=baseline,
        estimated_savings=float(
            paise(Decimal(str(baseline.estimated_total_cost)) - Decimal(str(total)))
        ),
    )


def quote_offers(request: OfferQuoteRequest) -> OfferQuoteResponse:
    destination = next(
        (card for card in CARDS if card.id == request.destination_card_id), None
    )
    if destination is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "CARD_NOT_FOUND", "message": "Mock destination not found."},
        )
    exposure = sum(card.outstanding for card in CARDS)
    quotes = [
        evaluate(
            offer,
            destination,
            request.amount,
            request.tenure_months or offer.default_tenure_months,
            exposure,
        )
        for offer in list_offers()
    ]
    best = {}
    for kind in ("balance_transfer", "refinancing"):
        ranked = sorted(
            (q for q in quotes if q.eligible and q.offer.offer_type == kind),
            key=lambda q: (
                q.estimated_total_cost,
                q.offer.processing_days,
                q.estimated_fee,
                q.offer.id,
            ),
        )
        best[kind] = ranked[0].offer.id if ranked else None
        for rank, quote in enumerate(ranked, 1):
            quote.rank = rank
            difference = paise(
                Decimal(str(quote.estimated_total_cost))
                - Decimal(str(ranked[0].estimated_total_cost))
            )
            quote.ranking_explanation = (
                f'Rank {rank} among eligible {kind.replace("_", " ")} offers. '
                + (
                    "Lowest estimated total repayment for the evaluated tenure."
                    if rank == 1
                    else f"Costs ₹{difference:,.2f} more than the first-ranked eligible offer."
                )
                + " Ties use shorter processing time, lower fee, then stable offer ID. Ranking never uses partner payout."
            )
    for quote in quotes:
        if not quote.eligible:
            quote.ranking_explanation = "Not ranked: " + "; ".join(
                f"{reason.code}: {reason.message}" for reason in quote.blocking_reasons
            )
    quotes.sort(
        key=lambda q: (
            not q.eligible,
            q.estimated_total_cost,
            q.offer.processing_days,
            q.estimated_fee,
            q.offer.id,
        )
    )
    return OfferQuoteResponse(
        destination=destination,
        amount=request.amount,
        portfolio_exposure=exposure,
        quotes=quotes,
        best_offer_ids=best,
        baseline=ComparisonBaseline(
            estimated_total_cost=cost_components(
                request.amount, "0", NORMAL_REPAYMENT_RATE
            )[2]
        ),
    )


def selected_offer(
    destination_id: str, amount: float, offer_id: str, tenure: int | None = None
) -> OfferQuote:
    get_offer(offer_id)  # Stable unknown-offer response, never silently falls back.
    response = quote_offers(
        OfferQuoteRequest(
            destination_card_id=destination_id, amount=amount, tenure_months=tenure
        )
    )
    return next(quote for quote in response.quotes if quote.offer.id == offer_id)


def references(destination_id: str, amount: float) -> list[OfferReference]:
    response = quote_offers(
        OfferQuoteRequest(destination_card_id=destination_id, amount=amount)
    )
    return [
        OfferReference(
            offer_type=q.offer.offer_type,
            offer_id=q.offer.id,
            headline=q.offer.headline,
            provider_name=q.offer.provider_name,
            estimated_total_cost=q.estimated_total_cost,
            estimated_savings=q.estimated_savings,
            tenure_months=q.tenure_months,
            explanation=q.ranking_explanation,
        )
        for q in response.quotes
        if q.rank == 1
    ]


def apply_offer(route, quote: OfferQuote):
    from .routing_models import BlockingReason, RuleResult

    checks = route.checks + [
        RuleResult(key=f"offer_{check.code.lower()}", **check.model_dump())
        for check in quote.checks
    ]
    reasons = route.blocking_reasons + [
        BlockingReason(**reason.model_dump()) for reason in quote.blocking_reasons
    ]
    return route.model_copy(
        update={
            "recommendation_rank": None,
            "display_name": f"{quote.offer.provider_name} · {quote.offer.headline}",
            "eligible": route.eligible and quote.eligible,
            "eligibility_status": (
                "eligible" if route.eligible and quote.eligible else "ineligible"
            ),
            "checks": checks,
            "blocking_reasons": reasons,
            "estimated_fee": quote.estimated_fee,
            "estimated_interest": quote.estimated_interest,
            "estimated_total_cost": quote.estimated_total_cost,
            "processing_time_label": quote.offer.processing_time_label,
            "explanation": quote.offer.description,
            "warnings": route.warnings + quote.offer.warnings,
            "assumptions": route.assumptions + quote.offer.assumptions,
        }
    )
