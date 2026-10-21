"""Replaceable prototype storage; mutations are atomic within one process."""

from collections.abc import Callable
from threading import RLock
from typing import Protocol
from .transaction_models import Transaction


class TransactionRepository(Protocol):
    def add(self, transaction: Transaction) -> None: ...
    def get(self, transaction_id: str) -> Transaction | None: ...
    def list(self) -> list[Transaction]: ...
    def update(
        self, transaction_id: str, change: Callable[[Transaction], Transaction]
    ) -> Transaction | None: ...


class InMemoryTransactionRepository:
    def __init__(self):
        self._items: dict[str, Transaction] = {}
        self._lock = RLock()

    def add(self, transaction: Transaction) -> None:
        with self._lock:
            if transaction.id in self._items:
                raise ValueError("Duplicate transaction ID")
            self._items[transaction.id] = transaction.model_copy(deep=True)

    def get(self, transaction_id: str) -> Transaction | None:
        with self._lock:
            value = self._items.get(transaction_id)
            return value.model_copy(deep=True) if value else None

    def list(self) -> list[Transaction]:
        with self._lock:
            return [
                item.model_copy(deep=True)
                for item in sorted(
                    self._items.values(),
                    key=lambda item: (item.created_at, item.id),
                    reverse=True,
                )
            ]

    def update(
        self, transaction_id: str, change: Callable[[Transaction], Transaction]
    ) -> Transaction | None:
        with self._lock:
            value = self._items.get(transaction_id)
            if value is None:
                return None
            # Failed changes never mutate the stored transaction or event history.
            updated = change(value.model_copy(deep=True))
            self._items[transaction_id] = updated.model_copy(deep=True)
            return updated.model_copy(deep=True)
