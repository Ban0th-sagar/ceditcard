"""Versioned, reusable simulation-only routing contract."""

from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator
from .models import Card
from .offer_models import OfferReasonCode, OfferReference, OfferQuote

RouteType = Literal[
    "card_to_card", "balance_transfer", "normal_repayment", "refinancing"
]
RouteReasonCode = Literal[
    "DIFFERENT_CARDS_REQUIRED",
    "SOURCE_PROGRAM_DISABLED",
    "DESTINATION_DISABLED",
    "INSUFFICIENT_SOURCE_LIMIT",
    "EXCEEDS_OUTSTANDING",
    "EXCEEDS_PROTOTYPE_LIMIT",
    "INVALID_AMOUNT",
    "PAIR_NOT_SUPPORTED",
    "BALANCE_TRANSFER_LIMIT",
    "REFINANCE_MINIMUM",
]
ReasonCode = RouteReasonCode | OfferReasonCode

DISCLAIMER = (
    "Prototype simulation only. No real financial transaction is executed. "
    "Not proof of real issuer/network support or approval. Not financial advice."
)


class QuoteRequest(BaseModel):
    source_card_id: str = Field(min_length=1)
    destination_card_id: str = Field(min_length=1)
    amount: float = Field(
        strict=True, gt=0, le=1_000_000_000, multiple_of=0.01, allow_inf_nan=False
    )


class RouteQuoteSelectionRequest(QuoteRequest):
    model_config = ConfigDict(extra="forbid")
    offer_id: str | None = Field(default=None, min_length=1)
    offer_tenure_months: int | None = Field(default=None, strict=True, gt=0, le=120)

    @model_validator(mode="after")
    def tenure_requires_offer(self):
        if self.offer_tenure_months is not None and self.offer_id is None:
            raise ValueError("Select a fictional offer before selecting its tenure.")
        return self


class RuleResult(BaseModel):
    key: str
    code: ReasonCode
    label: str
    passed: bool
    message: str


class BlockingReason(BaseModel):
    code: ReasonCode
    message: str


class RouteOption(BaseModel):
    id: RouteType
    route_type: RouteType
    display_name: str
    eligible: bool
    eligibility_status: Literal["eligible", "ineligible"]
    checks: list[RuleResult]
    blocking_reasons: list[BlockingReason]
    warnings: list[str]
    amount: float
    estimated_fee: float
    estimated_interest: float
    estimated_total_cost: float
    processing_time_label: str
    recommendation_rank: int | None = None
    explanation: str
    pros: list[str]
    cons: list[str]
    assumptions: list[str]
    simulated: bool = True
    disclaimer: str = DISCLAIMER


class QuoteResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    selected_offer: OfferQuote | None = None
    marketplace_offers: list[OfferReference] = Field(default_factory=list)
    source: Card
    destination: Card
    amount: float
    checks: list[RuleResult]  # Six Phase 1 Card-to-Card checks for the summary.
    routes: list[RouteOption]
    recommended_route_id: RouteType | None
    recommendation: RouteOption | None
    recommendation_explanation: str
    simulated: bool = True
    disclaimer: str = DISCLAIMER


class PairCapability(BaseModel):
    source_card_id: str
    destination_card_id: str


class CapabilitiesResponse(BaseModel):
    simulated: bool = True
    disclaimer: str = DISCLAIMER
    supported_card_pairs: list[PairCapability]
    card_to_card_limit: float
    balance_transfer_limit: float
    refinancing_minimum: float
    route_types: list[RouteType]
