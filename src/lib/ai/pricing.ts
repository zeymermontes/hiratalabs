/**
 * Billing arithmetic, deliberately free of any database import so it can be
 * tested on its own. Prices are USD per 1M tokens, stored in millionths of a
 * dollar so nothing depends on float rounding surviving a round-trip.
 */
export const PRICE_SCALE = 1_000_000;

export function toMicros(dollars: number): number {
  return Math.round((Number.isFinite(dollars) ? dollars : 0) * PRICE_SCALE);
}

export function fromMicros(micros: number): number {
  return micros / PRICE_SCALE;
}

/** Cost in dollars for one call. */
export function costOf(
  inputTokens: number, outputTokens: number,
  inputPriceMicros: number, outputPriceMicros: number,
): number {
  const input = (inputTokens || 0) * fromMicros(inputPriceMicros);
  const output = (outputTokens || 0) * fromMicros(outputPriceMicros);
  return (input + output) / 1_000_000;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
