import unittest
from pydantic import ValidationError
from fastapi import HTTPException
from app.main import EligibilityRequest, optimize, portfolio


class RoutesTest(unittest.TestCase):
    def quote(self, source='icici_amazon', destination='hdfc_regalia', amount=10000):
        return optimize(EligibilityRequest(source_card_id=source, destination_card_id=destination, amount=amount))

    def test_portfolio_totals(self):
        data = portfolio()
        self.assertEqual(data['total_outstanding'], 69550)
        self.assertEqual(data['total_limit'], 450000)
        self.assertEqual(data['available_credit'], 380450)

    def test_demo_route(self):
        result = self.quote()
        self.assertEqual(len(result['checks']), 6)
        self.assertTrue(all(c['passed'] for c in result['checks']))
        self.assertEqual(len(result['quotes']), 4)
        self.assertEqual(result['recommendation']['route'], 'card_to_card')
        self.assertEqual(result['recommendation']['total_cost'], 10125)

    def test_disabled_source_uses_eligible_fallback(self):
        result = self.quote(source='axis_ace')
        self.assertFalse(result['quotes'][0]['eligible'])
        self.assertEqual(result['recommendation']['route'], 'refinancing')
        self.assertTrue(result['recommendation']['eligible'])

    def test_same_card_fails_card_route(self):
        self.assertFalse(self.quote(destination='icici_amazon')['checks'][0]['passed'])

    def test_prototype_limit(self):
        self.assertTrue(self.quote(amount=25000)['quotes'][0]['eligible'])
        self.assertFalse(self.quote(amount=25001)['quotes'][0]['eligible'])

    def test_outstanding_limit(self):
        self.assertFalse(self.quote(amount=31241)['checks'][4]['passed'])

    def test_unknown_card(self):
        with self.assertRaises(HTTPException) as error:
            self.quote(source='missing')
        self.assertEqual(error.exception.status_code, 404)

    def test_invalid_amounts(self):
        for value in [0, -1, float('inf'), float('nan')]:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                self.quote(amount=value)

    def test_recommendation_is_cheapest_eligible(self):
        for amount in [1, 4999, 5000, 25000, 25001, 60001]:
            result = self.quote(amount=amount)
            self.assertEqual(result['recommendation']['total_cost'], min(q['total_cost'] for q in result['quotes'] if q['eligible']))


if __name__ == '__main__':
    unittest.main()
