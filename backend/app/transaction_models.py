"""Simulation-only transaction contracts. Never accept client quote values."""

from datetime import datetime
from enum import StrEnum
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .models import Card
from .offer_models import OfferQuote
from .routing_models import QuoteRequest, RouteOption, RouteType

TRANSACTION_DISCLAIMER = (
    "Simulation Mode. No money moved. No bank/network/issuer integration. "
    "Local prototype events only; not financial advice or real approval."
)


class TransactionStatus(StrEnum):
    CREATED = "CREATED"
    ELIGIBILITY_CHECK = "ELIGIBILITY_CHECK"
    ELIGIBLE = "ELIGIBLE"
    AUTHORIZED = "AUTHORIZED"
    PROCESSING = "PROCESSING"
    SIMULATED_SETTLED = "SIMULATED_SETTLED"
    INELIGIBLE = "INELIGIBLE"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class CreateTransactionRequest(QuoteRequest):
    model_config = ConfigDict(extra="forbid")
    route_id: RouteType
    offer_id: str | None = Field(default=None, min_length=1)
    offer_tenure_months: int | None = Field(default=None, strict=True, gt=0, le=120)

    @model_validator(mode="after")
    def tenure_requires_offer(self):
        if self.offer_tenure_months is not None and self.offer_id is None:
            raise ValueError("An offer is required when selecting offer tenure.")
        return self

    demo_outcome: Literal["success", "fail_processing"] = "success"


class TransitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_status: TransactionStatus
    target_status: TransactionStatus | None = None


class CancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_status: TransactionStatus


class TransactionEvent(BaseModel):
    sequence: int
    status: TransactionStatus
    from_status: TransactionStatus | None
    timestamp: datetime
    message: str
    code: str | None = None


class Transaction(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    source_card_id: str
    destination_card_id: str
    source: Card
    destination: Card
    amount: float
    route_id: RouteType
    route_type: RouteType
    quoted_fee: float
    quoted_interest: float
    quoted_total_cost: float
    offer_id: str | None = None
    offer_tenure_months: int | None = None
    offer_quote_snapshot: OfferQuote | None = None
    latest_offer_snapshot: OfferQuote | None = None
    quote_snapshot: RouteOption
    latest_eligibility_snapshot: RouteOption | None = None
    demo_outcome: Literal["success", "fail_processing"]
    status: TransactionStatus
    history: list[TransactionEvent]
    failure_code: str | None = None
    failure_reason: str | None = None
    simulated: Literal[True] = True
    disclaimer: str = TRANSACTION_DISCLAIMER


class TransactionView(Transaction):
    allowed_actions: list[Literal["advance", "cancel"]]
    next_status: TransactionStatus | None
