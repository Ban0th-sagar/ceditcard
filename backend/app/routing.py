"""Central mock rules and provider boundary; no network or payment operations."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Protocol
from .data import CARDS
from .models import Card
from .routing_models import (
    BlockingReason,
    CapabilitiesResponse,
    PairCapability,
    QuoteResponse,
    ReasonCode,
    RouteOption,
    RouteType,
    RuleResult,
)

CARD_LIMIT = 25000
TRANSFER_LIMIT = 60000
REFINANCE_MINIMUM = 5000
# Test capability matrix derived from mock flags, never real issuer capabilities.
SUPPORTED_PAIRS = frozenset(
    (source.id, destination.id)
    for source in CARDS
    for destination in CARDS
    if source.id != destination.id
    and source.source_route_enabled
    and destination.destination_route_enabled
)


def rule(
    key: str, code: ReasonCode, label: str, passed: bool, message: str
) -> RuleResult:
    return RuleResult(key=key, code=code, label=label, passed=passed, message=message)


def card_checks(source: Card, destination: Card, amount: float) -> list[RuleResult]:
    """First six retain Phase 1 order; details also expose amount/pair policy."""
    return [
        rule(
            "different_cards",
            "DIFFERENT_CARDS_REQUIRED",
            "Different source and destination",
            source.id != destination.id,
            "Source and destination must be different cards.",
        ),
        rule(
            "source_enabled",
            "SOURCE_PROGRAM_DISABLED",
            "Source-card program eligibility",
            source.source_route_enabled,
            f"{source.issuer} mock source program is "
            + ("enabled." if source.source_route_enabled else "disabled."),
        ),
        rule(
            "destination_enabled",
            "DESTINATION_DISABLED",
            "Destination can receive this route",
            destination.destination_route_enabled,
            f"{destination.issuer} mock destination receipt is "
            + ("enabled." if destination.destination_route_enabled else "disabled."),
        ),
        rule(
            "available_limit",
            "INSUFFICIENT_SOURCE_LIMIT",
            "Available source limit",
            source.available_limit >= amount,
            f"Available mock source limit: ₹{source.available_limit:,.2f}.",
        ),
        rule(
            "destination_outstanding",
            "EXCEEDS_OUTSTANDING",
            "Amount does not exceed destination outstanding",
            destination.outstanding >= amount,
            f"Destination mock outstanding: ₹{destination.outstanding:,.2f}.",
        ),
        rule(
            "prototype_limit",
            "EXCEEDS_PROTOTYPE_LIMIT",
            "Prototype route limit",
            amount <= CARD_LIMIT,
            f"Prototype Card-to-Card limit: ₹{CARD_LIMIT:,.0f}.",
        ),
        rule(
            "positive_amount",
            "INVALID_AMOUNT",
            "Positive amount",
            amount > 0,
            "Amount must be greater than zero.",
        ),
        rule(
            "supported_pair",
            "PAIR_NOT_SUPPORTED",
            "Mock pair capability",
            (source.id, destination.id) in SUPPORTED_PAIRS,
            "This pair must be listed in the simulated capability matrix; this is not issuer support.",
        ),
    ]


class RouteProvider(Protocol):
    """A provider returns a typed quote; orchestration owns ranking/rationale."""

    route_type: RouteType

    def quote(
        self, source: Card, destination: Card, amount: float, *, legacy: bool = False
    ) -> RouteOption: ...


@dataclass(frozen=True)
class MockRouteProvider:
    route_type: RouteType
    name: str
    fee_rate: str
    interest_rate: str
    processing_time: str
    description: str
    pros: tuple[str, ...]
    cons: tuple[str, ...]

    def quote(
        self, source: Card, destination: Card, amount: float, *, legacy: bool = False
    ) -> RouteOption:
        checks = card_checks(source, destination, amount)
        if self.route_type == "card_to_card":
            checks = checks[:6] if legacy else checks
        else:
            # Alternative funding does not use the source card's credit limit/program.
            checks = [] if legacy else [checks[i] for i in (0, 2, 4, 6)]
            if self.route_type == "balance_transfer":
                checks.append(
                    rule(
                        "balance_transfer_limit",
                        "BALANCE_TRANSFER_LIMIT",
                        "Balance transfer limit",
                        amount <= TRANSFER_LIMIT,
                        f"Mock balance transfers are capped at ₹{TRANSFER_LIMIT:,.0f}.",
                    )
                )
            elif self.route_type == "refinancing":
                checks.append(
                    rule(
                        "refinance_minimum",
                        "REFINANCE_MINIMUM",
                        "Refinancing minimum",
                        amount >= REFINANCE_MINIMUM,
                        f"Mock refinancing starts at ₹{REFINANCE_MINIMUM:,.0f}.",
                    )
                )
        reasons = [
            BlockingReason(code=c.code, message=c.message)
            for c in checks
            if not c.passed
        ]
        principal = Decimal(str(amount))
        fee = (principal * Decimal(self.fee_rate)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        interest = (principal * Decimal(self.interest_rate)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total = (principal + fee + interest).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return RouteOption(
            id=self.route_type,
            route_type=self.route_type,
            display_name=self.name,
            eligible=not reasons,
            eligibility_status="ineligible" if reasons else "eligible",
            checks=checks,
            blocking_reasons=reasons,
            amount=amount,
            estimated_fee=float(fee),
            estimated_interest=float(interest),
            estimated_total_cost=float(total),
            processing_time_label=self.processing_time,
            explanation=self.description,
            warnings=["Illustrative estimates, not a live offer. No funds will move."],
            pros=list(self.pros),
            cons=list(self.cons),
            assumptions=[
                "All balances, rules, and processing times are simulated test configuration.",
                "Total includes principal, estimated fee, and estimated interest, rounded to paise.",
                (
                    "Prototype eligibility simulation, not proof of real issuer/network support."
                    if self.route_type == "card_to_card"
                    else "Alternative funding is assumed; source-card program support and limit do not apply."
                ),
            ],
        )


PROVIDERS: tuple[RouteProvider, ...] = (
    MockRouteProvider(
        "card_to_card",
        "Eligible Card-to-Card Route",
        "0.0125",
        "0",
        "Simulated · within 1 day",
        "Mock Card-to-Card eligibility only; not proof of real issuer/network support.",
        ("No estimated interest in this mock quote.",),
        ("Restricted mock programs and ₹25,000 prototype cap.",),
    ),
    MockRouteProvider(
        "balance_transfer",
        "Balance Transfer",
        "0.02",
        "0.015",
        "Simulated · 2–3 days",
        "Illustrative promotional balance-transfer comparison.",
        ("Mock promotional pricing.",),
        ("Processing fee and estimated interest apply.",),
    ),
    MockRouteProvider(
        "normal_repayment",
        "Normal Repayment",
        "0",
        "0.035",
        "Simulated · 1–2 days",
        "Illustrative carried-balance cost, not interest-free full repayment.",
        ("No processing fee.",),
        ("Assumes the balance is carried; full on-time repayment may differ.",),
    ),
    MockRouteProvider(
        "refinancing",
        "Refinancing",
        "0.01",
        "0.022",
        "Simulated · 3–5 days",
        "Illustrative refinancing quote; no lender connection or approval.",
        ("Alternative to unavailable Card-to-Card routes.",),
        ("Mock ₹5,000 minimum and estimated interest apply.",),
    ),
)


def quote_routes(
    source: Card, destination: Card, amount: float, *, legacy: bool = False
) -> QuoteResponse:
    routes = [
        provider.quote(source, destination, amount, legacy=legacy)
        for provider in PROVIDERS
    ]
    ranked = sorted(
        (route for route in routes if route.eligible),
        key=lambda route: (route.estimated_total_cost, route.id),
    )
    for rank, route in enumerate(ranked, 1):
        route.recommendation_rank = rank
    recommendation = ranked[0] if ranked else None
    explanation = (
        f"{recommendation.display_name} is the lowest-total-cost eligible route at ₹{recommendation.estimated_total_cost:,.2f} among the simulated options. Ineligible routes are excluded. "
        if recommendation
        else "No simulated route is eligible. Adjust the selected cards or amount; no route is recommended. "
    )
    if not routes[0].eligible:
        explanation += (
            "Card-to-Card is unavailable: "
            + "; ".join(
                f"{reason.code}: {reason.message}"
                for reason in routes[0].blocking_reasons
            )
            + " "
        )
    explanation += (
        "This is a simulation, not financial advice or issuer/network approval."
    )
    return QuoteResponse(
        source=source,
        destination=destination,
        amount=amount,
        checks=card_checks(source, destination, amount)[:6],
        routes=routes,
        recommended_route_id=recommendation.id if recommendation else None,
        recommendation=recommendation,
        recommendation_explanation=explanation,
    )


def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(
        supported_card_pairs=[
            PairCapability(source_card_id=s, destination_card_id=d)
            for s, d in sorted(SUPPORTED_PAIRS)
        ],
        card_to_card_limit=CARD_LIMIT,
        balance_transfer_limit=TRANSFER_LIMIT,
        refinancing_minimum=REFINANCE_MINIMUM,
        route_types=[provider.route_type for provider in PROVIDERS],
    )
