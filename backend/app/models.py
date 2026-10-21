from typing import Literal
from pydantic import BaseModel, Field

class Card(BaseModel):
    id: str
    issuer: str
    name: str
    network: str
    last_four: str
    credit_limit: float
    available_limit: float
    outstanding: float
    due_date: str
    minimum_due: float
    utilization: float
    source_route_enabled: bool = False
    destination_route_enabled: bool = True


class EligibilityRequest(BaseModel):
    source_card_id: str
    destination_card_id: str
    amount: float = Field(gt=0, allow_inf_nan=False)


class EligibilityCheck(BaseModel):
    key: str
    label: str
    passed: bool
    message: str


class RouteQuote(BaseModel):
    route: Literal["card_to_card", "balance_transfer", "normal_repayment", "refinancing"]
    label: str
    eligible: bool
    processing_fee: float
    estimated_interest: float
    total_cost: float
    amount: float
    explanation: str
