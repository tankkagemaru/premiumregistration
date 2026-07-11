import "server-only";
import { cache } from "react";

/**
 * Live FX — universities bill in different currencies (some in USD), but PECSB
 * reports in MYR. We store each fee/commission in its own currency and convert to
 * MYR for totals using live rates (base MYR), cached for an hour. If the rate
 * fetch fails we fall back to no conversion rather than break the page.
 */
export const BASE_CURRENCY = "MYR";

/** Currencies offered in the fee/price editors. */
export const CURRENCIES = ["MYR", "USD", "SGD", "GBP", "EUR", "AUD", "CNY", "INR"];

export interface FxRates {
  base: string;
  // rates[CCY] = units of CCY per 1 MYR (open.er-api.com convention).
  rates: Record<string, number>;
  live: boolean;
}

export const getFxRates = cache(async (): Promise<FxRates> => {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/MYR", {
      // Cache at the fetch layer for an hour — FX doesn't need to be real-time.
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const j = (await res.json()) as { rates?: Record<string, number> };
      if (j?.rates && typeof j.rates.USD === "number") {
        return { base: BASE_CURRENCY, rates: j.rates, live: true };
      }
    }
  } catch {
    // fall through to the no-op fallback
  }
  return { base: BASE_CURRENCY, rates: { MYR: 1 }, live: false };
});

/** Convert an amount in `currency` to MYR using the rates. Unknown/missing rate
 *  → returned unchanged (so a total is never silently zeroed). */
export function toMYR(amount: number, currency: string | null | undefined, fx: FxRates): number {
  if (!currency || currency === BASE_CURRENCY) return amount;
  const r = fx.rates[currency];
  return r && r > 0 ? amount / r : amount;
}
