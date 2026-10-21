"""Shared paise-safe simulation arithmetic; never live pricing."""

from decimal import Decimal, ROUND_HALF_UP

NORMAL_REPAYMENT_RATE = "0.035"


def paise(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cost_components(
    amount: float, fee_rate: str, interest_rate: str
) -> tuple[float, float, float]:
    principal = Decimal(str(amount))
    fee, interest = paise(principal * Decimal(fee_rate)), paise(
        principal * Decimal(interest_rate)
    )
    return float(fee), float(interest), float(paise(principal + fee + interest))
