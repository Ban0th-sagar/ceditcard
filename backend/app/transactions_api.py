"""Typed API adapter; state-machine and quote integrity stay in the service."""

from fastapi import APIRouter
from .transaction_models import (
    CancelRequest,
    CreateTransactionRequest,
    TransactionView,
    TransitionRequest,
)
from .transaction_repository import InMemoryTransactionRepository
from .transactions import TransactionService

router = APIRouter(prefix="/api/transactions", tags=["Simulated transactions"])
service = TransactionService(InMemoryTransactionRepository())


@router.post("", response_model=TransactionView, status_code=201)
def create_transaction(request: CreateTransactionRequest):
    return service.create(request)


@router.get("", response_model=list[TransactionView])
def list_transactions():
    return service.list()


@router.get("/{transaction_id}", response_model=TransactionView)
def get_transaction(transaction_id: str):
    return service.get(transaction_id)


@router.post("/{transaction_id}/advance", response_model=TransactionView)
def advance_transaction(transaction_id: str, request: TransitionRequest):
    return service.advance(transaction_id, request)


@router.post("/{transaction_id}/cancel", response_model=TransactionView)
def cancel_transaction(transaction_id: str, request: CancelRequest):
    return service.cancel(transaction_id, request)
