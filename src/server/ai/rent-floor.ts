import type { PriceEstimates } from "@/lib/types";

// The owner's rule: a suggested daily rent is at least a tenth of the item's
// secondhand price, for every kind of item. Kept free of other imports so the
// tests can load it directly.

export const MIN_RENT_SHARE = 0.1;

/** The least daily rent, in cents, for an item worth this many cents secondhand. Whole dollars, rounded up, at least $1. */
export function minDailyRentCents(saleCents: number): number {
  // The small offset keeps float error (7000 * 0.1 is 700.0000000000001) from rounding an exact tenth up.
  const dollars = Math.ceil((saleCents * MIN_RENT_SHARE) / 100 - 1e-9);
  return Math.max(1, dollars) * 100;
}

/** Raises the rent and the low end of its range to the floor. Estimates that already comply come back unchanged. */
export function withRentFloor(estimates: PriceEstimates): PriceEstimates {
  const { rental, sale } = estimates;
  const floor = minDailyRentCents(sale.amountCents);
  const low = rental.rangeCents[0];
  if (rental.amountCents >= floor && low >= floor) return estimates;
  const amountCents = Math.max(rental.amountCents, floor);
  return {
    ...estimates,
    rental: { ...rental, amountCents, rangeCents: [Math.max(low, floor), Math.max(rental.rangeCents[1], amountCents)] },
  };
}
