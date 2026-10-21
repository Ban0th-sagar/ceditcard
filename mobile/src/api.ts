import {
  CreateTransactionRequest,
  SimulatedTransaction,
  TransactionStatus,
} from "./transactionTypes";
import {
  Card,
  OptimizeResult,
  Portfolio,
  RouteQuoteRequest,
  RoutingQuoteResult,
} from "./types";

// Set EXPO_PUBLIC_API_URL for Expo Go or a separately hosted backend.
// Exported web builds use the API on the same origin by default.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/$/,
  "",
);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : body?.detail?.message
          ? `${body.detail.code}: ${body.detail.message}`
          : `Request failed (${response.status}).`,
    );
  }
  return response.json();
}

export const api = {
  transactions: () => request<SimulatedTransaction[]>("/api/transactions"),
  transaction: (id: string) =>
    request<SimulatedTransaction>(
      `/api/transactions/${encodeURIComponent(id)}`,
    ),
  createTransaction: (input: CreateTransactionRequest) =>
    request<SimulatedTransaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  advanceTransaction: (id: string, status: TransactionStatus) =>
    request<SimulatedTransaction>(
      `/api/transactions/${encodeURIComponent(id)}/advance`,
      { method: "POST", body: JSON.stringify({ expected_status: status }) },
    ),
  cancelTransaction: (id: string, status: TransactionStatus) =>
    request<SimulatedTransaction>(
      `/api/transactions/${encodeURIComponent(id)}/cancel`,
      { method: "POST", body: JSON.stringify({ expected_status: status }) },
    ),
  quote: (input: RouteQuoteRequest) =>
    request<RoutingQuoteResult>("/api/routes/quote", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cards: () => request<Card[]>("/api/cards"),
  portfolio: () => request<Portfolio>("/api/portfolio"),
  optimize: (
    source_card_id: string,
    destination_card_id: string,
    amount: number,
  ) =>
    request<OptimizeResult>("/api/optimize", {
      method: "POST",
      body: JSON.stringify({ source_card_id, destination_card_id, amount }),
    }),
};
