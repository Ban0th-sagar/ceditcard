import { Card, OptimizeResult, Portfolio } from './types';

// Set EXPO_PUBLIC_API_URL for Expo Go or a separately hosted backend.
// Exported web builds use the API on the same origin by default.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status}).`);
  }
  return response.json();
}

export const api = {
  cards: () => request<Card[]>('/api/cards'),
  portfolio: () => request<Portfolio>('/api/portfolio'),
  optimize: (source_card_id: string, destination_card_id: string, amount: number) =>
    request<OptimizeResult>('/api/optimize', {
      method: 'POST',
      body: JSON.stringify({ source_card_id, destination_card_id, amount }),
    }),
};
