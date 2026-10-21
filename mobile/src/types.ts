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
