import unittest
from decimal import Decimal
from pydantic import ValidationError
from app.data import CARDS
from app.main import routes_quote
from app.routing import card_checks, capabilities, quote_routes, MockRouteProvider
from app.routing_models import QuoteRequest, QuoteResponse
from fastapi import HTTPException


class RoutingEngineTest(unittest.TestCase):
    def setUp(self):
        self.source = next(c for c in CARDS if c.id == "icici_amazon")
        self.destination = next(c for c in CARDS if c.id == "hdfc_regalia")

    def quote(self, source=None, destination=None, amount=10000):
        return quote_routes(
            source or self.source, destination or self.destination, amount
        )

    def assert_blocked(self, quote, code):
        route = quote.routes[0]
        self.assertFalse(route.eligible)
        self.assertIn(code, [r.code for r in route.blocking_reasons])
        self.assertIsNone(route.recommendation_rank)
        for option in quote.routes:
            self.assertEqual(
                option.eligible, all(check.passed for check in option.checks)
            )
            self.assertEqual(
                [r.code for r in option.blocking_reasons],
                [c.code for c in option.checks if not c.passed],
            )

    def test_demo_and_typed_roundtrip(self):
        quote = self.quote()
        self.assertEqual(len(quote.routes), 4)
        self.assertEqual(len(quote.checks), 6)
        self.assertEqual(len(quote.routes[0].checks), 8)
        self.assertTrue(all(check.passed for check in quote.routes[0].checks))
        self.assertEqual(quote.recommended_route_id, "card_to_card")
        self.assertEqual(quote.recommendation.estimated_total_cost, 10125)
        self.assertEqual(
            QuoteResponse.model_validate_json(quote.model_dump_json()), quote
        )

    def test_disabled_source_and_fallback(self):
        quote = self.quote(source=next(c for c in CARDS if c.id == "axis_ace"))
        self.assert_blocked(quote, "SOURCE_PROGRAM_DISABLED")
        self.assertTrue(all(route.eligible for route in quote.routes[1:]))
        self.assertEqual(quote.recommended_route_id, "refinancing")
        self.assertEqual(quote.recommendation.estimated_total_cost, 10320)
        self.assertIn("SOURCE_PROGRAM_DISABLED", quote.recommendation_explanation)
        self.assertIn(
            "lowest-total-cost eligible route", quote.recommendation_explanation
        )

    def test_same_card_blocks_every_route(self):
        quote = self.quote(destination=self.source)
        self.assert_blocked(quote, "DIFFERENT_CARDS_REQUIRED")
        self.assertTrue(all(not route.eligible for route in quote.routes))
        self.assertIsNone(quote.recommended_route_id)
        self.assertIsNone(quote.recommendation)
        self.assertIn(
            "No simulated route is eligible", quote.recommendation_explanation
        )

    def test_destination_disabled_blocks_every_route(self):
        quote = self.quote(
            destination=self.destination.model_copy(
                update={"destination_route_enabled": False}
            )
        )
        self.assert_blocked(quote, "DESTINATION_DISABLED")
        self.assertTrue(all(not route.eligible for route in quote.routes))

    def test_source_limit_with_independent_alternatives(self):
        quote = self.quote(
            source=self.source.model_copy(update={"available_limit": 9999})
        )
        self.assert_blocked(quote, "INSUFFICIENT_SOURCE_LIMIT")
        self.assertTrue(all(route.eligible for route in quote.routes[1:]))

    def test_source_limit_boundary(self):
        self.assertTrue(
            self.quote(source=self.source.model_copy(update={"available_limit": 10000}))
            .routes[0]
            .eligible
        )

    def test_outstanding_boundary_and_excess(self):
        self.assertTrue(
            self.quote(
                amount=25000,
                destination=self.destination.model_copy(update={"outstanding": 25000}),
            )
            .routes[0]
            .eligible
        )
        quote = self.quote(amount=self.destination.outstanding + 1)
        self.assert_blocked(quote, "EXCEEDS_OUTSTANDING")
        self.assertIsNone(quote.recommendation)
        self.assertTrue(all(not route.eligible for route in quote.routes))

    def test_prototype_limit_boundary(self):
        self.assertTrue(self.quote(amount=25000).routes[0].eligible)
        self.assert_blocked(self.quote(amount=25000.01), "EXCEEDS_PROTOTYPE_LIMIT")
        self.assertTrue(self.quote(amount=25000.01).routes[1].eligible)

    def test_explicit_mock_pair_matrix(self):
        # Enabling a flag is insufficient when the configured pair is unsupported.
        source = next(c for c in CARDS if c.id == "axis_ace").model_copy(
            update={"source_route_enabled": True}
        )
        self.assert_blocked(self.quote(source=source), "PAIR_NOT_SUPPORTED")
        config = capabilities()
        self.assertTrue(config.simulated)
        self.assertEqual(len(config.route_types), 4)
        pairs = {
            (pair.source_card_id, pair.destination_card_id)
            for pair in config.supported_card_pairs
        }
        self.assertIn((self.source.id, self.destination.id), pairs)
        self.assertNotIn((source.id, self.destination.id), pairs)

    def test_nonpositive_rule_code(self):
        for amount in [0, -1]:
            checks = card_checks(self.source, self.destination, amount)
            self.assertEqual(
                next(c.code for c in checks if c.key == "positive_amount"),
                "INVALID_AMOUNT",
            )
            self.assertFalse(
                next(c.passed for c in checks if c.key == "positive_amount")
            )

    def test_invalid_request_amounts(self):
        for amount in [
            0,
            -1,
            float("inf"),
            float("nan"),
            0.001,
            1_000_000_001,
            True,
            "10000",
        ]:
            with self.subTest(amount=amount), self.assertRaises(ValidationError):
                QuoteRequest(
                    source_card_id=self.source.id,
                    destination_card_id=self.destination.id,
                    amount=amount,
                )

    def test_unknown_source_and_destination(self):
        for source, destination in [
            ("missing", self.destination.id),
            (self.source.id, "missing"),
        ]:
            with self.subTest(
                source=source, destination=destination
            ), self.assertRaises(HTTPException) as error:
                routes_quote(
                    QuoteRequest(
                        source_card_id=source,
                        destination_card_id=destination,
                        amount=10000,
                    )
                )
            self.assertEqual(error.exception.status_code, 404)
            self.assertEqual(error.exception.detail["code"], "CARD_NOT_FOUND")

    def test_fallback_limit_boundaries(self):
        destination = self.destination.model_copy(update={"outstanding": 100000})
        self.assertTrue(
            self.quote(amount=60000, destination=destination).routes[1].eligible
        )
        route = self.quote(amount=60000.01, destination=destination).routes[1]
        self.assertFalse(route.eligible)
        self.assertIn(
            "BALANCE_TRANSFER_LIMIT", [r.code for r in route.blocking_reasons]
        )
        self.assertFalse(self.quote(amount=4999.99).routes[3].eligible)
        self.assertIn(
            "REFINANCE_MINIMUM",
            [r.code for r in self.quote(amount=4999.99).routes[3].blocking_reasons],
        )
        self.assertTrue(self.quote(amount=5000).routes[3].eligible)

    def test_rank_and_minimum_across_amounts_and_sources(self):
        for source in CARDS:
            for amount in [0.01, 1, 4999.99, 5000, 10000, 25000, 25000.01, 100000]:
                quote = self.quote(source=source, amount=amount)
                eligible = sorted(
                    (route for route in quote.routes if route.eligible),
                    key=lambda route: (route.estimated_total_cost, route.id),
                )
                if eligible:
                    self.assertEqual(quote.recommended_route_id, eligible[0].id)
                    self.assertEqual(
                        [route.recommendation_rank for route in eligible],
                        list(range(1, len(eligible) + 1)),
                    )
                else:
                    self.assertIsNone(quote.recommendation)

    def test_rounded_costs_sum_exactly(self):
        for amount in [0.01, 1, 10.01, 9999.99, 10000]:
            for route in self.quote(amount=amount).routes:
                expected = (
                    Decimal(str(amount))
                    + Decimal(str(route.estimated_fee))
                    + Decimal(str(route.estimated_interest))
                )
                self.assertEqual(Decimal(str(route.estimated_total_cost)), expected)
        self.assertEqual(self.quote(amount=10).routes[0].estimated_fee, 0.13)

    def test_deterministic_tie_break(self):
        quote = self.quote(amount=0.01)
        self.assertEqual(quote.recommended_route_id, "balance_transfer")
        self.assertEqual(quote.routes[1].recommendation_rank, 1)

    def test_simulation_contract_and_details_for_all_routes(self):
        for route in self.quote().routes:
            self.assertTrue(route.simulated)
            self.assertTrue(route.processing_time_label.startswith("Simulated"))
            self.assertTrue(
                route.pros and route.cons and route.assumptions and route.warnings
            )
            self.assertIn("Not proof of real issuer/network support", route.disclaimer)
            self.assertTrue(route.checks)

    def test_provider_boundary_can_return_typed_quote(self):
        provider = MockRouteProvider(
            "normal_repayment",
            "Test provider",
            "0",
            "0.035",
            "Simulated",
            "Test quote",
            ("Mock benefit",),
            ("Mock limitation",),
        )
        self.assertEqual(
            provider.quote(self.source, self.destination, 10000).estimated_total_cost,
            10350,
        )


if __name__ == "__main__":
    unittest.main()
