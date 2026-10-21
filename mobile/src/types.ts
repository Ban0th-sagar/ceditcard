export type Card = {
  id: string;
  issuer: string;
  name: string;
  network: string;
  last_four: string;
  credit_limit: number;
  available_limit: number;
  outstanding: number;
  due_date: string;
  minimum_due: number;
  utilization: number;
  source_route_enabled: boolean;
  destination_route_enabled: boolean;
};

export type EligibilityCheck = {
  key: string;
  label: string;
  passed: boolean;
  message: string;
};

export type RouteQuote = {
  route: string;
  label: string;
  eligible: boolean;
  processing_fee: number;
  estimated_interest: number;
  total_cost: number;
  amount: number;
  explanation: string;
};

export type OptimizeResult = {
  source: Card;
  destination: Card;
  amount: number;
  checks: EligibilityCheck[];
  quotes: RouteQuote[];
  recommendation: RouteQuote;
  disclaimer: string;
};

export type Portfolio = {
  total_limit: number;
  total_outstanding: number;
  available_credit: number;
  utilization: number;
  next_due: Card;
};

export type RouteType =
  | "card_to_card"
  | "balance_transfer"
  | "normal_repayment"
  | "refinancing";
export type ReasonCode =
  | "DIFFERENT_CARDS_REQUIRED"
  | "SOURCE_PROGRAM_DISABLED"
  | "DESTINATION_DISABLED"
  | "INSUFFICIENT_SOURCE_LIMIT"
  | "EXCEEDS_OUTSTANDING"
  | "EXCEEDS_PROTOTYPE_LIMIT"
  | "INVALID_AMOUNT"
  | "PAIR_NOT_SUPPORTED"
  | "BALANCE_TRANSFER_LIMIT"
  | "REFINANCE_MINIMUM";
export type RuleResult = EligibilityCheck & { code: ReasonCode };
export type RouteOption = {
  id: RouteType;
  route_type: RouteType;
  display_name: string;
  eligible: boolean;
  eligibility_status: "eligible" | "ineligible";
  checks: RuleResult[];
  blocking_reasons: { code: ReasonCode; message: string }[];
  warnings: string[];
  amount: number;
  estimated_fee: number;
  estimated_interest: number;
  estimated_total_cost: number;
  processing_time_label: string;
  recommendation_rank: number | null;
  explanation: string;
  pros: string[];
  cons: string[];
  assumptions: string[];
  simulated: boolean;
  disclaimer: string;
};
export type RouteQuoteRequest = {
  source_card_id: string;
  destination_card_id: string;
  amount: number;
};
export type RoutingQuoteResult = {
  schema_version: "1.0";
  source: Card;
  destination: Card;
  amount: number;
  checks: RuleResult[];
  routes: RouteOption[];
  recommended_route_id: RouteType | null;
  recommendation: RouteOption | null;
  recommendation_explanation: string;
  simulated: boolean;
  disclaimer: string;
};
