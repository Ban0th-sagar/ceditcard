import type { OfferQuote } from "./offerTypes";
import { Card, RouteOption, RouteQuoteRequest, RouteType } from "./types";
export type TransactionStatus =
  | "CREATED"
  | "ELIGIBILITY_CHECK"
  | "ELIGIBLE"
  | "AUTHORIZED"
  | "PROCESSING"
  | "SIMULATED_SETTLED"
  | "INELIGIBLE"
  | "FAILED"
  | "CANCELLED";
export type DemoOutcome = "success" | "fail_processing";
export type CreateTransactionRequest = RouteQuoteRequest & {
  route_id: RouteType;
  demo_outcome: DemoOutcome;
};
export type TransactionEvent = {
  sequence: number;
  status: TransactionStatus;
  from_status: TransactionStatus | null;
  timestamp: string;
  message: string;
  code: string | null;
};
export type SimulatedTransaction = {
  id: string;
  created_at: string;
  updated_at: string;
  source_card_id: string;
  destination_card_id: string;
  source: Card;
  destination: Card;
  amount: number;
  route_id: RouteType;
  route_type: RouteType;
  quoted_fee: number;
  quoted_interest: number;
  quoted_total_cost: number;
  quote_snapshot: RouteOption;
  offer_id: string | null;
  offer_tenure_months: number | null;
  offer_quote_snapshot: OfferQuote | null;
  latest_offer_snapshot: OfferQuote | null;
  latest_eligibility_snapshot: RouteOption | null;
  demo_outcome: DemoOutcome;
  status: TransactionStatus;
  history: TransactionEvent[];
  failure_code: string | null;
  failure_reason: string | null;
  simulated: true;
  disclaimer: string;
  allowed_actions: ("advance" | "cancel")[];
  next_status: TransactionStatus | null;
};
