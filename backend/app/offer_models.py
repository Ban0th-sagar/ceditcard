"""Fictional offer contracts. No live providers, offers or approvals."""

from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from .models import Card

OfferType = Literal["balance_transfer", "refinancing"]
OfferReasonCode = Literal[
    "OFFER_INACTIVE",
    "OFFER_EXPIRED",
    "BELOW_OFFER_MINIMUM",
    "ABOVE_OFFER_MAXIMUM",
    "OFFER_EXCEEDS_OUTSTANDING",
    "OFFER_DESTINATION_DISABLED",
    "UTILIZATION_TOO_HIGH",
    "PORTFOLIO_EXPOSURE_TOO_LOW",
    "PORTFOLIO_EXPOSURE_TOO_HIGH",
    "UNSUPPORTED_TENURE",
]
OFFER_DISCLAIMER = (
    "Fictional demo offer. Illustrative simulation only; not an approval or financial advice. "
    "No live pricing, application, bureau pull, KYC, integration, or money movement."
)
RESPONSIBLE_CREDIT = (
    "Lower monthly payment can mean longer repayment time. Compare total repayment, "
    "not only EMI/monthly amount. Savings are illustrative, not guaranteed."
)


class Offer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    offer_type: OfferType
    provider_name: str
    headline: str
    description: str
    minimum_amount: float
    maximum_amount: float
    processing_fee_rate: float
    annual_flat_rate: float
    tenure_options: list[int]
    default_tenure_months: int
    processing_days: int
    processing_time_label: str
    maximum_utilization: float = 50
    minimum_portfolio_exposure: float = 0
    maximum_portfolio_exposure: float = 200000
    active: bool = True
    expires_on: date = date(2099, 12, 31)
    eligibility_criteria: list[str]
    warnings: list[str]
    assumptions: list[str]
    simulated: Literal[True] = True
    disclaimer: str = OFFER_DISCLAIMER


class OfferQuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    destination_card_id: str = Field(min_length=1)
    amount: float = Field(
        strict=True, gt=0, le=1_000_000_000, multiple_of=0.01, allow_inf_nan=False
    )
    tenure_months: int | None = Field(default=None, strict=True, gt=0, le=120)


class OfferCheck(BaseModel):
    code: OfferReasonCode
    label: str
    passed: bool
    message: str


class OfferBlockingReason(BaseModel):
    code: OfferReasonCode
    message: str


class ComparisonBaseline(BaseModel):
    label: str = (
        "Phase 3 Normal Repayment: single-cycle carried-balance illustration, not a tenure-matched loan"
    )
    estimated_total_cost: float
    assumptions: str = (
        "One illustrative 3.5% carried-balance cost. Different from a multi-month loan horizon; no guaranteed savings."
    )


class OfferQuote(BaseModel):
    offer: Offer
    destination_card_id: str
    amount: float
    tenure_months: int
    eligible: bool
    checks: list[OfferCheck]
    blocking_reasons: list[OfferBlockingReason]
    estimated_fee: float
    estimated_interest: float
    estimated_total_cost: float
    monthly_payment_estimate: float
    final_payment_estimate: float
    baseline: ComparisonBaseline
    estimated_savings: float
    rank: int | None = None
    ranking_explanation: str = ""
    simulated: Literal[True] = True
    disclaimer: str = OFFER_DISCLAIMER


class OfferQuoteResponse(BaseModel):
    destination: Card
    amount: float
    portfolio_exposure: float
    quotes: list[OfferQuote]
    best_offer_ids: dict[OfferType, str | None]
    baseline: ComparisonBaseline
    responsible_credit: str = RESPONSIBLE_CREDIT
    simulated: Literal[True] = True
    disclaimer: str = OFFER_DISCLAIMER


class OfferReference(BaseModel):
    offer_type: OfferType
    offer_id: str
    headline: str
    provider_name: str
    estimated_total_cost: float
    estimated_savings: float
    tenure_months: int
    explanation: str
