import { randomInt } from "node:crypto";
import type { DataState } from "@/lib/data-state";
import type { Rental } from "@/lib/types";
import { deals } from "@/server/deals/store";
import { DataError } from "./store";

/**
 * SIMULATED PAYMENT LEDGER. No card is touched and no money moves.
 * The rental record itself is the ledger: holdCents is the amount held,
 * capturedCents what was charged, releasedCents what went back.
 *
 * To connect a real provider, implement PaymentProvider (hold -> authorize,
 * settle -> capture the fee, release the rest) and swap it in at the two call
 * sites in the hold and settle routes. Everything else stays the same.
 */
export interface PaymentProvider {
  mode: "simulated" | "live";
  authorize(input: { rentalId: string; amountCents: number }): void;
  capture(input: { rentalId: string; captureCents: number; releaseCents: number }): void;
}

export const simulatedPayments: PaymentProvider = {
  mode: "simulated",
  authorize() {},
  capture() {},
};

const DAY_MS = 86_400_000;

export interface HoldInput { itemId: string; days: number; negotiationId?: string; pickupAt?: string }

/** Prices come from the stored item and negotiation, never from the client. */
export function createHold(state: DataState, input: HoldInput, provider: PaymentProvider = simulatedPayments): Rental {
  // One hold per agreed deal: authorizing the same negotiation again returns the existing rental.
  const existing = input.negotiationId && state.rentals.find((r) => r.negotiationId === input.negotiationId);
  if (existing) return existing;
  const item = state.items.find((i) => i.id === input.itemId);
  if (!item) throw new DataError("Item not found", 404);
  if (item.kind !== "rental" || !item.rental) throw new DataError("This item is not for rent", 400);
  if (!item.available) throw new DataError("This item is not available right now", 409);
  const terms = item.rental;

  let days = input.days;
  let dailyFeeCents = terms.dailyFeeCents;
  if (input.negotiationId) {
    const record = deals.get(input.negotiationId);
    if (!record) throw new DataError("Negotiation not found", 404);
    const deal = record.negotiation;
    if (deal.itemId !== item.id) throw new DataError("This negotiation is for a different item", 409);
    if (deal.status !== "deal" || deal.agreedDailyCents === undefined) throw new DataError("There is no agreed price yet", 409);
    dailyFeeCents = deal.agreedDailyCents;
    days = deal.days;
  }
  if (days > terms.maxDays) throw new DataError(`This item rents for up to ${terms.maxDays} days`, 400);

  const holdCents = days * dailyFeeCents + terms.depositCents;
  const pickup = input.pickupAt && Number.isFinite(Date.parse(input.pickupAt)) ? new Date(input.pickupAt) : new Date();
  const rental: Rental = {
    id: `rental-${crypto.randomUUID()}`,
    itemId: item.id,
    shopId: item.shopId,
    ...(input.negotiationId ? { negotiationId: input.negotiationId } : {}),
    days,
    dailyFeeCents,
    depositCents: terms.depositCents,
    holdCents,
    status: "reserved",
    pickupCode: String(randomInt(100000, 1000000)),
    pickupAt: pickup.toISOString(),
    returnBy: new Date(pickup.getTime() + days * DAY_MS).toISOString(),
    pickupPhotos: [],
    returnPhotos: [],
  };
  provider.authorize({ rentalId: rental.id, amountCents: holdCents });
  state.rentals.push(rental);
  return rental;
}

/** Captures the fee plus any extra, never more than the hold, and releases the rest. */
export function settleHold(state: DataState, rentalId: string, extraChargeCents: number, provider: PaymentProvider = simulatedPayments): Rental {
  const current = state.rentals.find((r) => r.id === rentalId);
  if (!current) throw new DataError("Rental not found", 404);
  if (current.status === "settled") throw new DataError("This rental is already settled", 409);
  if (current.status !== "returned") throw new DataError("The item must be returned before this rental can be settled", 409);
  const capturedCents = Math.min(current.holdCents, current.days * current.dailyFeeCents + extraChargeCents);
  const releasedCents = current.holdCents - capturedCents;
  provider.capture({ rentalId, captureCents: capturedCents, releaseCents: releasedCents });
  const next: Rental = { ...current, status: "settled", capturedCents, releasedCents };
  state.rentals = state.rentals.map((r) => (r.id === rentalId ? next : r));
  return next;
}
