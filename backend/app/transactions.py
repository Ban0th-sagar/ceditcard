"""Local transaction simulation. All state rules live here, never in clients."""

from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from . import routing, offers
from .services import get_card
from .transaction_models import (
    CancelRequest,
    CreateTransactionRequest,
    Transaction,
    TransactionEvent,
    TransactionStatus as Status,
    TransactionView,
    TransitionRequest,
)
from .transaction_repository import TransactionRepository

# Explicit graph: no arbitrary target states, callbacks, or automatic timers.
NEXT_STATE = {
    Status.CREATED: Status.ELIGIBILITY_CHECK,
    Status.ELIGIBILITY_CHECK: Status.ELIGIBLE,
    Status.ELIGIBLE: Status.AUTHORIZED,
    Status.AUTHORIZED: Status.PROCESSING,
    Status.PROCESSING: Status.SIMULATED_SETTLED,
}
CANCELLABLE = frozenset(
    {Status.CREATED, Status.ELIGIBILITY_CHECK, Status.ELIGIBLE, Status.AUTHORIZED}
)
MESSAGES = {
    Status.CREATED: "Simulation created with a fresh backend quote. No money moved.",
    Status.ELIGIBILITY_CHECK: "Checking the simulated route again. No bank contacted.",
    Status.ELIGIBLE: "Mock eligibility rechecked; the route remains eligible.",
    Status.AUTHORIZED: "Authorized locally for simulation only. No credentials or issuer approval.",
    Status.PROCESSING: "Processing locally in Simulation Mode. No payment instruction sent.",
    Status.SIMULATED_SETTLED: "Simulated settled. No money moved; balances were not changed.",
    Status.CANCELLED: "Simulation cancelled before processing. No money moved.",
    Status.INELIGIBLE: "Route became ineligible during the backend recheck. Request a new quote.",
    Status.FAILED: "Deterministic processing-failure demo. Start a new simulation with success mode to retry.",
}


def reject(code: str, message: str, status: int = 409, **details):
    raise HTTPException(
        status_code=status, detail={"code": code, "message": message, **details}
    )


class TransactionService:
    def __init__(self, repository: TransactionRepository):
        self.repository = repository

    def _quote(self, source_id: str, destination_id: str, amount: float, route_id: str):
        try:
            source, destination = get_card(source_id), get_card(destination_id)
        except HTTPException:
            reject("CARD_NOT_FOUND", "Selected mock card not found.", 404)
        quote = routing.quote_routes(source, destination, amount)
        route = next((route for route in quote.routes if route.id == route_id), None)
        if route is None:
            reject("ROUTE_NOT_FOUND", "Selected simulated route not found.", 422)
        return quote, route

    def _next(self, transaction: Transaction) -> Status | None:
        if (
            transaction.status == Status.PROCESSING
            and transaction.demo_outcome == "fail_processing"
        ):
            return Status.FAILED
        return NEXT_STATE.get(transaction.status)

    def _view(self, transaction: Transaction) -> TransactionView:
        actions = []
        if self._next(transaction) is not None:
            actions.append("advance")
        if transaction.status in CANCELLABLE:
            actions.append("cancel")
        return TransactionView(
            **transaction.model_dump(),
            allowed_actions=actions,
            next_status=self._next(transaction),
        )

    def create(self, request: CreateTransactionRequest) -> TransactionView:
        quote, route = self._quote(
            request.source_card_id,
            request.destination_card_id,
            request.amount,
            request.route_id,
        )
        offer_quote = None
        if request.offer_id is not None:
            offer_quote = offers.selected_offer(
                request.destination_card_id,
                request.amount,
                request.offer_id,
                request.offer_tenure_months,
            )
            if offer_quote.offer.offer_type != request.route_id:
                reject(
                    "OFFER_ROUTE_MISMATCH",
                    "Selected fictional offer does not match the selected route.",
                )
            if not offer_quote.eligible:
                reject(
                    "OFFER_INELIGIBLE",
                    "Fictional offer failed backend revalidation. No transaction created.",
                    blocking_reasons=[
                        reason.model_dump() for reason in offer_quote.blocking_reasons
                    ],
                )
            route = offers.apply_offer(route, offer_quote)
        if not route.eligible:
            reject(
                "ROUTE_INELIGIBLE",
                "The backend recheck blocked this simulated route. No transaction was created.",
                blocking_reasons=[
                    reason.model_dump() for reason in route.blocking_reasons
                ],
            )
        now = datetime.now(timezone.utc)
        transaction = Transaction(
            id=str(uuid4()),
            created_at=now,
            updated_at=now,
            source_card_id=quote.source.id,
            destination_card_id=quote.destination.id,
            source=quote.source,
            destination=quote.destination,
            amount=quote.amount,
            route_id=route.id,
            route_type=route.route_type,
            quoted_fee=route.estimated_fee,
            quoted_interest=route.estimated_interest,
            quoted_total_cost=route.estimated_total_cost,
            quote_snapshot=route,
            offer_id=offer_quote.offer.id if offer_quote else None,
            offer_tenure_months=offer_quote.tenure_months if offer_quote else None,
            offer_quote_snapshot=offer_quote,
            demo_outcome=request.demo_outcome,
            status=Status.CREATED,
            history=[
                TransactionEvent(
                    sequence=1,
                    status=Status.CREATED,
                    from_status=None,
                    timestamp=now,
                    message=MESSAGES[Status.CREATED],
                )
            ],
        )
        self.repository.add(transaction)
        return self._view(transaction)

    def get(self, transaction_id: str) -> TransactionView:
        transaction = self.repository.get(transaction_id)
        if transaction is None:
            reject(
                "TRANSACTION_NOT_FOUND",
                "Simulated transaction not found. Server history may have reset.",
                404,
            )
        return self._view(transaction)

    def list(self) -> list[TransactionView]:
        return [self._view(transaction) for transaction in self.repository.list()]

    def _check_expected(self, transaction: Transaction, expected: Status):
        if transaction.status != expected:
            reject(
                "STALE_TRANSACTION_STATE",
                "The simulation changed. Refresh its timeline before trying again.",
                current_status=transaction.status,
            )

    def _record(
        self,
        transaction: Transaction,
        status: Status,
        code: str | None = None,
        reason: str | None = None,
    ) -> Transaction:
        now = datetime.now(timezone.utc)
        transaction.history.append(
            TransactionEvent(
                sequence=len(transaction.history) + 1,
                from_status=transaction.status,
                status=status,
                timestamp=now,
                message=reason or MESSAGES[status],
                code=code,
            )
        )
        transaction.status, transaction.updated_at = status, now
        transaction.failure_code, transaction.failure_reason = code, reason
        return transaction

    def advance(
        self, transaction_id: str, request: TransitionRequest
    ) -> TransactionView:
        def change(transaction: Transaction):
            self._check_expected(transaction, request.expected_status)
            next_status = self._next(transaction)
            if next_status is None or (
                request.target_status is not None
                and request.target_status != next_status
            ):
                reject(
                    "INVALID_TRANSITION",
                    "Only the next allowed local simulation step may be advanced.",
                )
            if transaction.status == Status.ELIGIBILITY_CHECK:
                _, route = self._quote(
                    transaction.source_card_id,
                    transaction.destination_card_id,
                    transaction.amount,
                    transaction.route_id,
                )
                if transaction.offer_id:
                    try:
                        offer_quote = offers.selected_offer(
                            transaction.destination_card_id,
                            transaction.amount,
                            transaction.offer_id,
                            transaction.offer_tenure_months,
                        )
                    except HTTPException:
                        return self._record(
                            transaction,
                            Status.INELIGIBLE,
                            "OFFER_NO_LONGER_AVAILABLE",
                            "Fictional offer is no longer available. Request a new quote. No money moved.",
                        )
                    transaction.latest_offer_snapshot = offer_quote
                    route = offers.apply_offer(route, offer_quote)
                transaction.latest_eligibility_snapshot = route
                if not route.eligible:
                    return self._record(
                        transaction,
                        Status.INELIGIBLE,
                        "ROUTE_BECAME_INELIGIBLE",
                        MESSAGES[Status.INELIGIBLE]
                        + " "
                        + "; ".join(
                            f"{r.code}: {r.message}" for r in route.blocking_reasons
                        ),
                    )
            if next_status == Status.FAILED:
                return self._record(
                    transaction,
                    next_status,
                    "DEMO_PROCESSING_FAILURE",
                    MESSAGES[Status.FAILED],
                )
            return self._record(transaction, next_status)

        updated = self.repository.update(transaction_id, change)
        if updated is None:
            return self.get(transaction_id)  # raises the same stable not-found error
        return self._view(updated)

    def cancel(self, transaction_id: str, request: CancelRequest) -> TransactionView:
        def change(transaction: Transaction):
            self._check_expected(transaction, request.expected_status)
            if transaction.status not in CANCELLABLE:
                reject(
                    "CANCELLATION_NOT_ALLOWED",
                    "Only a pre-processing simulation can be cancelled.",
                )
            return self._record(transaction, Status.CANCELLED)

        updated = self.repository.update(transaction_id, change)
        if updated is None:
            return self.get(transaction_id)
        return self._view(updated)
