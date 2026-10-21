import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from fastapi import HTTPException
from pydantic import ValidationError
from app.data import CARDS
from app.transaction_models import (
    CancelRequest,
    CreateTransactionRequest,
    TransactionStatus as S,
    TransitionRequest,
)
from app.transaction_repository import InMemoryTransactionRepository
from app.transactions import CANCELLABLE, NEXT_STATE, TransactionService


class TransactionTest(unittest.TestCase):
    def setUp(self):
        self.repo = InMemoryTransactionRepository()
        self.service = TransactionService(self.repo)
        self.data = dict(
            source_card_id="icici_amazon",
            destination_card_id="hdfc_regalia",
            amount=10000,
            route_id="card_to_card",
        )

    def create(self, **kwargs):
        return self.service.create(CreateTransactionRequest(**(self.data | kwargs)))

    def advance(self, tx, **kwargs):
        return self.service.advance(
            tx.id, TransitionRequest(expected_status=tx.status, **kwargs)
        )

    def go_to(self, status, **kwargs):
        tx = self.create(**kwargs)
        while tx.status != status:
            tx = self.advance(tx)
        return tx

    def assert_error(self, code, call, status=409):
        with self.assertRaises(HTTPException) as error:
            call()
        self.assertEqual(error.exception.status_code, status)
        self.assertEqual(error.exception.detail["code"], code)

    def test_create_authoritative_snapshot(self):
        tx = self.create()
        self.assertEqual(tx.status, S.CREATED)
        self.assertEqual(
            (tx.quoted_fee, tx.quoted_interest, tx.quoted_total_cost), (125, 0, 10125)
        )
        self.assertEqual(tx.quote_snapshot.estimated_total_cost, tx.quoted_total_cost)
        self.assertTrue(tx.simulated)
        self.assertEqual(tx.allowed_actions, ["advance", "cancel"])
        self.assertEqual(tx.history[0].from_status, None)
        self.assertIn("No money moved", tx.disclaimer)
        self.assertIn("No bank/network/issuer integration", tx.disclaimer)

    def test_reject_client_quote_eligibility_status_and_credentials_fields(self):
        for extra in [
            {"quoted_fee": 0},
            {"eligible": True},
            {"quote_snapshot": {}},
            {"status": "SIMULATED_SETTLED"},
            {"total_cost": 1},
            {"pan": "not-a-card"},
        ]:
            with self.subTest(extra=extra), self.assertRaises(ValidationError):
                CreateTransactionRequest(**(self.data | extra))
        self.assertEqual(self.service.list(), [])

    def test_ineligible_creation_rejected_without_saving(self):
        for change in [
            dict(source_card_id="axis_ace"),
            dict(destination_card_id="icici_amazon"),
            dict(amount=40000),
        ]:
            self.assert_error("ROUTE_INELIGIBLE", lambda: self.create(**change))
        self.assertEqual(self.repo.list(), [])

    def test_create_rechecks_current_engine_configuration(self):
        self.create()  # An earlier eligible quote/transaction is not authorization.
        with patch("app.routing.SUPPORTED_PAIRS", frozenset()):
            self.assert_error("ROUTE_INELIGIBLE", self.create)
        self.assertEqual(len(self.service.list()), 1)

    def test_eligible_fallback_can_be_simulated(self):
        tx = self.create(source_card_id="axis_ace", route_id="refinancing")
        self.assertEqual(tx.quoted_total_cost, 10320)
        self.assertTrue(tx.quote_snapshot.eligible)

    def test_invalid_input(self):
        for change in [
            {"amount": 0},
            {"amount": -1},
            {"amount": float("nan")},
            {"amount": 0.001},
            {"route_id": "unknown"},
            {"demo_outcome": "random"},
        ]:
            with self.subTest(change=change), self.assertRaises(ValidationError):
                CreateTransactionRequest(**(self.data | change))
        self.assert_error(
            "CARD_NOT_FOUND", lambda: self.create(source_card_id="missing"), 404
        )
        self.assert_error(
            "CARD_NOT_FOUND", lambda: self.create(destination_card_id="missing"), 404
        )

    def test_success_graph_and_balances_unchanged(self):
        before = [card.model_dump() for card in CARDS]
        tx = self.create()
        states = [tx.status]
        while tx.next_status:
            tx = self.advance(tx)
            states.append(tx.status)
        self.assertEqual(
            states,
            [
                S.CREATED,
                S.ELIGIBILITY_CHECK,
                S.ELIGIBLE,
                S.AUTHORIZED,
                S.PROCESSING,
                S.SIMULATED_SETTLED,
            ],
        )
        self.assertEqual([event.status for event in tx.history], states)
        self.assertEqual([event.sequence for event in tx.history], list(range(1, 7)))
        self.assertEqual(
            [event.from_status for event in tx.history], [None] + states[:-1]
        )
        self.assertTrue(all(event.timestamp.tzinfo for event in tx.history))
        self.assertEqual(tx.created_at, tx.history[0].timestamp)
        self.assertEqual(tx.updated_at, tx.history[-1].timestamp)
        self.assertTrue(tx.latest_eligibility_snapshot.eligible)
        self.assertEqual(tx.allowed_actions, [])
        self.assertEqual(before, [card.model_dump() for card in CARDS])

    def test_invalid_skip_does_not_corrupt_state(self):
        tx = self.create()
        self.assert_error(
            "INVALID_TRANSITION",
            lambda: self.advance(tx, target_status=S.SIMULATED_SETTLED),
        )
        self.assertEqual(self.service.get(tx.id), tx)

    def test_all_skip_transitions_rejected(self):
        for current in NEXT_STATE:
            for target in S:
                if target == NEXT_STATE[current]:
                    continue
                with self.subTest(current=current, target=target):
                    tx = self.go_to(current)
                    self.assert_error(
                        "INVALID_TRANSITION",
                        lambda: self.advance(tx, target_status=target),
                    )
                    self.assertEqual(self.service.get(tx.id), tx)

    def test_explicit_valid_target(self):
        tx = self.create()
        self.assertEqual(
            self.advance(tx, target_status=S.ELIGIBILITY_CHECK).status,
            S.ELIGIBILITY_CHECK,
        )

    def test_stale_advances_and_cancels_rejected(self):
        old = self.create()
        current = self.advance(old)
        self.assert_error("STALE_TRANSACTION_STATE", lambda: self.advance(old))
        self.assert_error(
            "STALE_TRANSACTION_STATE",
            lambda: self.service.cancel(
                old.id, CancelRequest(expected_status=old.status)
            ),
        )
        self.assertEqual(self.service.get(old.id), current)

    def test_atomic_concurrent_advance(self):
        tx = self.create()

        def advance():
            try:
                return self.advance(tx).status
            except HTTPException as error:
                return error.detail["code"]

        with ThreadPoolExecutor(max_workers=2) as executor:
            outcomes = list(executor.map(lambda _: advance(), range(2)))
        self.assertCountEqual(
            outcomes, [S.ELIGIBILITY_CHECK, "STALE_TRANSACTION_STATE"]
        )
        self.assertEqual(len(self.service.get(tx.id).history), 2)

    def test_cancel_from_every_allowed_state(self):
        for status in CANCELLABLE:
            with self.subTest(status=status):
                tx = self.go_to(status)
                cancelled = self.service.cancel(
                    tx.id, CancelRequest(expected_status=status)
                )
                self.assertEqual(cancelled.status, S.CANCELLED)
                self.assertEqual(cancelled.history[-1].from_status, status)
                self.assertEqual(cancelled.allowed_actions, [])
                self.assertIsNone(cancelled.next_status)

    def test_processing_cannot_cancel(self):
        tx = self.go_to(S.PROCESSING)
        self.assert_error(
            "CANCELLATION_NOT_ALLOWED",
            lambda: self.service.cancel(
                tx.id, CancelRequest(expected_status=tx.status)
            ),
        )
        self.assertEqual(self.service.get(tx.id), tx)

    def test_failure_is_deterministic_and_terminal(self):
        for _ in range(2):
            tx = self.go_to(S.PROCESSING, demo_outcome="fail_processing")
            self.assertEqual(tx.next_status, S.FAILED)
            tx = self.advance(tx)
            self.assertEqual(tx.status, S.FAILED)
            self.assertEqual(tx.failure_code, "DEMO_PROCESSING_FAILURE")
            self.assertIn("Deterministic", tx.failure_reason)
            self.assertEqual(tx.allowed_actions, [])

    def test_eligibility_recheck_can_become_ineligible(self):
        tx = self.go_to(S.ELIGIBILITY_CHECK)
        with patch("app.routing.SUPPORTED_PAIRS", frozenset()):
            tx = self.advance(tx)
        self.assertEqual(tx.status, S.INELIGIBLE)
        self.assertEqual(tx.failure_code, "ROUTE_BECAME_INELIGIBLE")
        self.assertIn("PAIR_NOT_SUPPORTED", tx.failure_reason)
        self.assertTrue(tx.quote_snapshot.eligible)
        self.assertFalse(tx.latest_eligibility_snapshot.eligible)
        self.assertEqual(tx.allowed_actions, [])

    def test_all_terminal_states_reject_mutation(self):
        success = self.go_to(S.SIMULATED_SETTLED)
        failed = self.advance(self.go_to(S.PROCESSING, demo_outcome="fail_processing"))
        created = self.create()
        cancelled = self.service.cancel(
            created.id, CancelRequest(expected_status=created.status)
        )
        check = self.go_to(S.ELIGIBILITY_CHECK)
        with patch("app.routing.SUPPORTED_PAIRS", frozenset()):
            ineligible = self.advance(check)
        for tx in [success, failed, cancelled, ineligible]:
            self.assert_error("INVALID_TRANSITION", lambda: self.advance(tx))
            self.assert_error(
                "CANCELLATION_NOT_ALLOWED",
                lambda: self.service.cancel(
                    tx.id, CancelRequest(expected_status=tx.status)
                ),
            )
            self.assertEqual(self.service.get(tx.id), tx)

    def test_get_list_not_found_and_newest_first(self):
        first, second = self.create(), self.create()
        self.assertEqual(self.service.get(first.id), first)
        self.assertEqual([tx.id for tx in self.service.list()], [second.id, first.id])
        self.assert_error(
            "TRANSACTION_NOT_FOUND", lambda: self.service.get("missing"), 404
        )
        self.assert_error(
            "TRANSACTION_NOT_FOUND",
            lambda: self.service.advance(
                "missing", TransitionRequest(expected_status=S.CREATED)
            ),
            404,
        )
        self.assert_error(
            "TRANSACTION_NOT_FOUND",
            lambda: self.service.cancel(
                "missing", CancelRequest(expected_status=S.CREATED)
            ),
            404,
        )

    def test_repository_and_snapshot_are_defensive_copies(self):
        tx = self.create()
        tx.quote_snapshot.estimated_total_cost = 1
        tx.source.name = "Changed"
        stored = self.repo.get(tx.id)
        self.assertEqual(stored.quoted_total_cost, 10125)
        self.assertEqual(stored.quote_snapshot.estimated_total_cost, 10125)
        self.assertEqual(stored.source.name, "Amazon Pay")
        listed = self.repo.list()
        listed[0].history.clear()
        self.assertEqual(len(self.repo.get(tx.id).history), 1)


if __name__ == "__main__":
    unittest.main()
