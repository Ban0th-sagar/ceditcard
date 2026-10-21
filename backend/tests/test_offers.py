import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import patch
from fastapi import HTTPException
from pydantic import ValidationError
from app.data import CARDS
from app.offer_models import OfferQuoteRequest, OfferQuoteResponse, Offer
from app.offers import evaluate, get_offer, list_offers, quote_offers, selected_offer
from app.offer_catalog import CATALOG
from app.main import routes_quote
from app.routing_models import RouteQuoteSelectionRequest
from app.transaction_models import CreateTransactionRequest, TransitionRequest
from app.transaction_repository import InMemoryTransactionRepository
from app.transactions import TransactionService


class OffersTest(unittest.TestCase):
    def setUp(self):
        self.destination = next(c for c in CARDS if c.id == "hdfc_regalia")
        self.offer = get_offer("cedar_transfer")
        self.service = TransactionService(InMemoryTransactionRepository())
        self.input = dict(
            source_card_id="icici_amazon",
            destination_card_id="hdfc_regalia",
            amount=20000,
            route_id="balance_transfer",
            offer_id="cedar_transfer",
            offer_tenure_months=6,
        )

    def quote(self, amount=20000, **kwargs):
        return quote_offers(
            OfferQuoteRequest(
                destination_card_id="hdfc_regalia", amount=amount, **kwargs
            )
        )

    def test_fictional_catalog_and_defensive_reads(self):
        catalog = list_offers()
        self.assertGreaterEqual(
            sum(o.offer_type == "balance_transfer" for o in catalog), 3
        )
        self.assertGreaterEqual(sum(o.offer_type == "refinancing" for o in catalog), 3)
        self.assertTrue(
            all(o.provider_name.startswith("Demo ") and o.simulated for o in catalog)
        )
        self.assertTrue(
            all(
                o.warnings and o.assumptions and o.eligibility_criteria for o in catalog
            )
        )
        catalog[0].active = False
        self.assertTrue(get_offer("cedar_transfer").active)
        self.assertNotIn("partner_payout", Offer.model_fields)

    def test_twenty_thousand_demo_cost_rank_and_savings(self):
        response = self.quote()
        eligible = [
            q
            for q in response.quotes
            if q.eligible and q.offer.offer_type == "balance_transfer"
        ]
        self.assertEqual(
            [q.offer.id for q in eligible], ["cedar_transfer", "birch_transfer"]
        )
        self.assertEqual([q.estimated_total_cost for q in eligible], [20300, 20600])
        self.assertEqual([q.rank for q in eligible], [1, 2])
        self.assertEqual(response.best_offer_ids["balance_transfer"], "cedar_transfer")
        self.assertEqual(response.baseline.estimated_total_cost, 20700)
        self.assertEqual(eligible[0].estimated_savings, 400)
        self.assertIn("₹300.00 more", eligible[1].ranking_explanation)
        self.assertEqual(
            OfferQuoteResponse.model_validate_json(response.model_dump_json()), response
        )

    def test_refinance_tenures_negative_savings_and_inactive(self):
        quotes = self.quote(amount=10000).quotes
        quartz = next(q for q in quotes if q.offer.id == "quartz_refinance")
        lumen = next(q for q in quotes if q.offer.id == "lumen_refinance")
        self.assertTrue(quartz.eligible and lumen.eligible)
        self.assertEqual((quartz.tenure_months, lumen.tenure_months), (6, 12))
        self.assertLess(lumen.monthly_payment_estimate, quartz.monthly_payment_estimate)
        self.assertGreater(lumen.estimated_total_cost, quartz.estimated_total_cost)
        self.assertLess(quartz.estimated_savings, 0)
        paper = next(q for q in quotes if q.offer.id == "paper_inactive")
        self.assertFalse(paper.eligible)
        self.assertIsNone(paper.rank)
        self.assertIn("OFFER_INACTIVE", [r.code for r in paper.blocking_reasons])

    def test_each_stable_eligibility_rule(self):
        cases = [
            (
                "OFFER_INACTIVE",
                self.offer.model_copy(update={"active": False}),
                self.destination,
                20000,
                6,
                69550,
            ),
            (
                "OFFER_EXPIRED",
                self.offer.model_copy(update={"expires_on": date(2000, 1, 1)}),
                self.destination,
                20000,
                6,
                69550,
            ),
            ("BELOW_OFFER_MINIMUM", self.offer, self.destination, 4999.99, 6, 69550),
            (
                "ABOVE_OFFER_MAXIMUM",
                self.offer,
                self.destination.model_copy(update={"outstanding": 100000}),
                50000.01,
                6,
                69550,
            ),
            (
                "OFFER_EXCEEDS_OUTSTANDING",
                self.offer,
                self.destination,
                31240.01,
                6,
                69550,
            ),
            (
                "OFFER_DESTINATION_DISABLED",
                self.offer,
                self.destination.model_copy(
                    update={"destination_route_enabled": False}
                ),
                20000,
                6,
                69550,
            ),
            (
                "UTILIZATION_TOO_HIGH",
                self.offer,
                self.destination.model_copy(update={"utilization": 51}),
                20000,
                6,
                69550,
            ),
            (
                "PORTFOLIO_EXPOSURE_TOO_LOW",
                self.offer.model_copy(update={"minimum_portfolio_exposure": 70000}),
                self.destination,
                20000,
                6,
                69550,
            ),
            (
                "PORTFOLIO_EXPOSURE_TOO_HIGH",
                self.offer.model_copy(update={"maximum_portfolio_exposure": 60000}),
                self.destination,
                20000,
                6,
                69550,
            ),
            ("UNSUPPORTED_TENURE", self.offer, self.destination, 20000, 9, 69550),
        ]
        for code, offer, card, amount, tenure, exposure in cases:
            with self.subTest(code=code):
                quote = evaluate(offer, card, amount, tenure, exposure)
                self.assertFalse(quote.eligible)
                self.assertIn(code, [r.code for r in quote.blocking_reasons])
                self.assertEqual(
                    [r.code for r in quote.blocking_reasons],
                    [c.code for c in quote.checks if not c.passed],
                )

    def test_boundary_amounts_and_utilization(self):
        card = self.destination.model_copy(
            update={"outstanding": 100000, "utilization": 50}
        )
        for amount in [5000, 50000]:
            self.assertTrue(evaluate(self.offer, card, amount, 6, 200000).eligible)
        self.assertTrue(evaluate(self.offer, card, 5000, 6, 0).eligible)

    def test_paisee_safe_cost_and_monthly_reconciliation(self):
        for amount in [0.01, 0.03, 5000, 9999.99, 20000]:
            for q in self.quote(amount=amount).quotes:
                principal, fee, interest, total = map(
                    lambda v: Decimal(str(v)),
                    [
                        q.amount,
                        q.estimated_fee,
                        q.estimated_interest,
                        q.estimated_total_cost,
                    ],
                )
                self.assertEqual(principal + fee + interest, total)
                self.assertEqual(
                    Decimal(str(q.monthly_payment_estimate)) * (q.tenure_months - 1)
                    + Decimal(str(q.final_payment_estimate)),
                    total,
                )
                self.assertGreaterEqual(q.final_payment_estimate, 0)

    def test_supported_tenure_and_default_policy(self):
        self.assertEqual(
            selected_offer("hdfc_regalia", 20000, "cedar_transfer").tenure_months, 6
        )
        longer = selected_offer("hdfc_regalia", 20000, "cedar_transfer", 12)
        self.assertTrue(longer.eligible)
        self.assertEqual(longer.estimated_total_cost, 20500)
        self.assertFalse(
            selected_offer("hdfc_regalia", 20000, "birch_transfer", 12).eligible
        )

    def test_tie_break_processing_fee_and_id_not_payout(self):
        base = self.offer
        for left, right, expected in [
            (
                base.model_copy(update={"id": "a", "processing_days": 3}),
                base.model_copy(update={"id": "b", "processing_days": 1}),
                "b",
            ),
            (
                base.model_copy(update={"id": "a"}),
                base.model_copy(
                    update={
                        "id": "b",
                        "processing_fee_rate": 0.01,
                        "annual_flat_rate": 0.01,
                    }
                ),
                "a",
            ),
            (
                base.model_copy(update={"id": "b"}),
                base.model_copy(update={"id": "a"}),
                "a",
            ),
        ]:
            with patch.dict(CATALOG, {left.id: left, right.id: right}, clear=True):
                self.assertEqual(
                    self.quote().best_offer_ids["balance_transfer"], expected
                )

    def test_no_eligible_offers_and_empty_catalog(self):
        response = self.quote(amount=40000)
        self.assertTrue(all(not q.eligible for q in response.quotes))
        self.assertTrue(all(q.rank is None for q in response.quotes))
        with patch.dict(CATALOG, {}, clear=True):
            response = self.quote()
            self.assertEqual(response.quotes, [])
            self.assertEqual(response.baseline.estimated_total_cost, 20700)

    def test_unknown_offer_and_destination(self):
        for call in [
            lambda: get_offer("missing"),
            lambda: selected_offer("hdfc_regalia", 10000, "missing"),
        ]:
            with self.assertRaises(HTTPException) as error:
                call()
            self.assertEqual(error.exception.detail["code"], "OFFER_NOT_FOUND")
        with self.assertRaises(HTTPException) as error:
            quote_offers(OfferQuoteRequest(destination_card_id="missing", amount=20000))
        self.assertEqual(error.exception.detail["code"], "CARD_NOT_FOUND")

    def test_forged_and_invalid_offer_inputs_rejected(self):
        for extra in [
            dict(amount=0),
            dict(amount=-1),
            dict(amount=True),
            dict(amount=float("inf")),
            dict(amount=0.001),
            dict(tenure_months=0),
            dict(tenure_months="6"),
            dict(tenure_months=True),
            dict(estimated_fee=0),
            dict(partner_payout=99999),
        ]:
            with self.subTest(extra=extra), self.assertRaises(ValidationError):
                OfferQuoteRequest(
                    **(dict(destination_card_id="hdfc_regalia", amount=20000) | extra)
                )

    def test_route_reference_and_selected_offer_quote(self):
        request = dict(
            source_card_id="icici_amazon",
            destination_card_id="hdfc_regalia",
            amount=20000,
        )
        quote = routes_quote(RouteQuoteSelectionRequest(**request))
        self.assertEqual(
            next(
                r.offer_id
                for r in quote.marketplace_offers
                if r.offer_type == "balance_transfer"
            ),
            "cedar_transfer",
        )
        selected = routes_quote(
            RouteQuoteSelectionRequest(
                **request, offer_id="cedar_transfer", offer_tenure_months=6
            )
        )
        self.assertEqual(selected.routes[1].estimated_total_cost, 20300)
        self.assertEqual(selected.selected_offer.offer.id, "cedar_transfer")
        self.assertEqual(selected.routes[0], quote.routes[0])
        self.assertEqual(selected.routes[2], quote.routes[2])

    def test_transaction_snapshot_and_state_machine_reuse(self):
        tx = self.service.create(CreateTransactionRequest(**self.input))
        self.assertEqual(tx.offer_id, "cedar_transfer")
        self.assertIsNone(tx.quote_snapshot.recommendation_rank)
        self.assertEqual(tx.offer_tenure_months, 6)
        self.assertEqual(tx.quoted_total_cost, 20300)
        self.assertEqual(
            tx.offer_quote_snapshot.estimated_total_cost,
            tx.quote_snapshot.estimated_total_cost,
        )
        for _ in range(5):
            tx = self.service.advance(
                tx.id, TransitionRequest(expected_status=tx.status)
            )
        self.assertEqual(tx.status, "SIMULATED_SETTLED")
        self.assertEqual(
            self.service.get(tx.id).offer_quote_snapshot.offer.headline,
            "Cedar Clear Transfer",
        )

    def test_offer_revalidated_at_creation_and_snapshot_unchanged(self):
        earlier = selected_offer("hdfc_regalia", 20000, "cedar_transfer")
        self.assertTrue(earlier.eligible)
        with patch.dict(
            CATALOG, {"cedar_transfer": self.offer.model_copy(update={"active": False})}
        ):
            with self.assertRaises(HTTPException) as error:
                self.service.create(CreateTransactionRequest(**self.input))
            self.assertEqual(error.exception.detail["code"], "OFFER_INELIGIBLE")
            self.assertEqual(self.service.list(), [])

    def test_expired_min_max_inactive_and_mismatched_offer_cannot_simulate(self):
        variants = [
            dict(offer_id="paper_inactive", route_id="refinancing"),
            dict(amount=4999.99),
            dict(amount=50000.01),
            dict(route_id="refinancing"),
        ]
        for extra in variants:
            with self.subTest(extra=extra), self.assertRaises(HTTPException):
                self.service.create(CreateTransactionRequest(**(self.input | extra)))
        with patch.dict(
            CATALOG,
            {
                "cedar_transfer": self.offer.model_copy(
                    update={"expires_on": date(2000, 1, 1)}
                )
            },
        ):
            with self.assertRaises(HTTPException) as error:
                self.service.create(CreateTransactionRequest(**self.input))
            self.assertEqual(error.exception.detail["code"], "OFFER_INELIGIBLE")
        self.assertEqual(self.service.list(), [])

    def test_creation_reprices_from_current_catalog(self):
        with patch.dict(
            CATALOG,
            {
                "cedar_transfer": self.offer.model_copy(
                    update={"processing_fee_rate": 0.02}
                )
            },
        ):
            tx = self.service.create(CreateTransactionRequest(**self.input))
        self.assertEqual(tx.quoted_fee, 400)
        self.assertEqual(tx.quoted_total_cost, 20600)

    def test_offer_revalidated_during_eligibility_and_preserves_original(self):
        tx = self.service.create(CreateTransactionRequest(**self.input))
        tx = self.service.advance(tx.id, TransitionRequest(expected_status=tx.status))
        with patch.dict(
            CATALOG, {"cedar_transfer": self.offer.model_copy(update={"active": False})}
        ):
            tx = self.service.advance(
                tx.id, TransitionRequest(expected_status=tx.status)
            )
        self.assertEqual(tx.status, "INELIGIBLE")
        self.assertTrue(tx.offer_quote_snapshot.eligible)
        self.assertFalse(tx.latest_offer_snapshot.eligible)
        self.assertEqual(tx.quoted_total_cost, 20300)
        self.assertIn("OFFER_INACTIVE", tx.failure_reason)

    def test_removed_offer_terminal_recheck(self):
        tx = self.service.create(CreateTransactionRequest(**self.input))
        tx = self.service.advance(tx.id, TransitionRequest(expected_status=tx.status))
        with patch.dict(CATALOG, {}, clear=True):
            tx = self.service.advance(
                tx.id, TransitionRequest(expected_status=tx.status)
            )
        self.assertEqual(tx.status, "INELIGIBLE")
        self.assertEqual(tx.failure_code, "OFFER_NO_LONGER_AVAILABLE")

    def test_transaction_offer_errors_and_forged_costs(self):
        with self.assertRaises(HTTPException) as error:
            self.service.create(
                CreateTransactionRequest(**(self.input | {"offer_id": "missing"}))
            )
        self.assertEqual(error.exception.detail["code"], "OFFER_NOT_FOUND")
        for extra in [
            {"estimated_total_cost": 1},
            {"offer_quote_snapshot": {}},
            {"offer_id": None, "offer_tenure_months": 6},
        ]:
            with self.assertRaises(ValidationError):
                CreateTransactionRequest(**(self.input | extra))


if __name__ == "__main__":
    unittest.main()
