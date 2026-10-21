import type { Card } from "./types";
export type OfferType = "balance_transfer" | "refinancing";
export type OfferReasonCode =
  | "OFFER_INACTIVE"
  | "OFFER_EXPIRED"
  | "BELOW_OFFER_MINIMUM"
  | "ABOVE_OFFER_MAXIMUM"
  | "OFFER_EXCEEDS_OUTSTANDING"
  | "OFFER_DESTINATION_DISABLED"
  | "UTILIZATION_TOO_HIGH"
  | "PORTFOLIO_EXPOSURE_TOO_LOW"
  | "PORTFOLIO_EXPOSURE_TOO_HIGH"
  | "UNSUPPORTED_TENURE";
export type FictionalOffer = {
  id: string;
  offer_type: OfferType;
  provider_name: string;
  headline: string;
  description: string;
  minimum_amount: number;
  maximum_amount: number;
  processing_fee_rate: number;
  annual_flat_rate: number;
  tenure_options: number[];
  default_tenure_months: number;
  processing_days: number;
  processing_time_label: string;
  maximum_utilization: number;
  minimum_portfolio_exposure: number;
  maximum_portfolio_exposure: number;
  active: boolean;
  expires_on: string;
  eligibility_criteria: string[];
  warnings: string[];
  assumptions: string[];
  simulated: true;
  disclaimer: string;
};
export type OfferBaseline = {
  label: string;
  estimated_total_cost: number;
  assumptions: string;
};
export type OfferQuote = {
  offer: FictionalOffer;
  destination_card_id: string;
  amount: number;
  tenure_months: number;
  eligible: boolean;
  checks: {
    code: OfferReasonCode;
    label: string;
    passed: boolean;
    message: string;
  }[];
  blocking_reasons: { code: OfferReasonCode; message: string }[];
  estimated_fee: number;
  estimated_interest: number;
  estimated_total_cost: number;
  monthly_payment_estimate: number;
  final_payment_estimate: number;
  baseline: OfferBaseline;
  estimated_savings: number;
  rank: number | null;
  ranking_explanation: string;
  simulated: true;
  disclaimer: string;
};
export type OfferQuoteRequest = {
  destination_card_id: string;
  amount: number;
  tenure_months?: number | null;
};
export type OfferQuoteResponse = {
  destination: Card;
  amount: number;
  portfolio_exposure: number;
  quotes: OfferQuote[];
  best_offer_ids: Record<OfferType, string | null>;
  baseline: OfferBaseline;
  responsible_credit: string;
  simulated: true;
  disclaimer: string;
};
export type OfferReference = {
  offer_type: OfferType;
  offer_id: string;
  headline: string;
  provider_name: string;
  estimated_total_cost: number;
  estimated_savings: number;
  tenure_months: number;
  explanation: string;
};
