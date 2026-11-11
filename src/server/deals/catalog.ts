import { availabilityIssue, DAY_MS } from "@/server/availability";
import { readDataState } from "@/server/data/store";

export class DealInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

/** Visitor-supplied prices never replace the seller's persisted rental terms. */
export function rentalForDeal(itemId: string, days: number) {
  const data = readDataState();
  const item = data.items.find((candidate) => candidate.id === itemId);
  const shop = item && data.shops.find((candidate) => candidate.id === item.shopId);
  if (!item || !shop?.liveAt) throw new DealInputError("Published rental not found.", 404);
  if (!item.available) throw new DealInputError("This rental is no longer available.", 409);
  if (item.kind !== "rental" || !item.rental) throw new DealInputError("This item cannot be rented.");
  if (item.rental.dailyFeeCents <= 0) throw new DealInputError("Set a positive rental price before negotiating.");
  if (days > item.rental.maxDays) throw new DealInputError(`This rental is available for at most ${item.rental.maxDays} days.`);
  // The hold applies the item's availability window, so a deal it would refuse is refused here first.
  // Checkout starts an undated rental when the window opens, or now if it is already open.
  const start = Math.max(Date.now(), item.availableFrom ? Date.parse(item.availableFrom) : 0);
  const issue = availabilityIssue(item, { startsAt: new Date(start).toISOString(), endsAt: new Date(start + days * DAY_MS).toISOString() });
  if (issue) throw new DealInputError(issue, 409);
  return item as typeof item & { rental: NonNullable<typeof item.rental> };
}

export interface DealItem {
  kind: "rental" | "sale";
  name: string;
  /** Asking price in cents: per day for a rental, one-off for a sale. */
  listCents: number;
  /** Private lowest acceptable price, same unit as listCents. */
  floorCents: number;
  /** Always 1 for a sale. */
  days: number;
}

/** The saved terms to negotiate over. Sale items have no seller-set minimum, so the floor is derived here. */
export function itemForDeal(itemId: string, days: number): DealItem {
  const stored = readDataState().items.find((candidate) => candidate.id === itemId);
  if (stored?.kind === "food") throw new DealInputError("Food cannot be negotiated.");
  if (stored?.kind !== "sale") {
    const item = rentalForDeal(itemId, days);
    return { kind: "rental", name: item.name, listCents: item.rental.dailyFeeCents, floorCents: item.rental.minDailyFeeCents, days };
  }
  const shop = readDataState().shops.find((candidate) => candidate.id === stored.shopId);
  if (!shop?.liveAt) throw new DealInputError("Published item not found.", 404);
  if (!stored.available) throw new DealInputError("This item is no longer available.", 409);
  const price = stored.priceCents ?? 0;
  if (price <= 0) throw new DealInputError("Set a positive price before negotiating.");
  // A derived default, because sellers cannot set a minimum on a sale item yet: the low end of the suggested
  // sale range, kept between 70% and 90% of the asking price. Without a suggestion it is 80%.
  // (The stored schema keeps no per-kind `estimates`, so the item's own suggestion is the one to read.)
  const low = stored.suggestion?.rangeCents[0];
  const floorCents = Math.round(low === undefined ? 0.8 * price : Math.min(Math.max(low, 0.7 * price), 0.9 * price));
  return { kind: "sale", name: stored.name, listCents: price, floorCents, days: 1 };
}

/** The item's saved price in cents (per day for a rental), or undefined when the item is gone. */
export function storedListCents(itemId: string): number | undefined {
  const item = readDataState().items.find((candidate) => candidate.id === itemId);
  return item?.kind === "sale" ? item.priceCents : item?.rental?.dailyFeeCents;
}

export interface DealBackground {
  kind: "rental" | "sale";
  itemName: string;
  description: string;
  category: string;
  condition: string;
  ownerName: string;
  shopName: string;
  neighborhood: string;
}

/** Public facts both agents may talk about. It never includes the terms or the floor. */
export function dealBackground(itemId: string, fallbackName: string, kind: "rental" | "sale" = "rental"): DealBackground {
  let data;
  try {
    data = readDataState();
  } catch {
    data = null;
  }
  const item = data?.items.find((candidate) => candidate.id === itemId);
  const shop = item && data?.shops.find((candidate) => candidate.id === item.shopId);
  return {
    kind,
    itemName: item?.name ?? fallbackName,
    description: (item?.description ?? "").slice(0, 300),
    category: item?.category ?? "gear",
    condition: item?.condition ?? "unknown",
    ownerName: shop?.ownerFirstName ?? "the owner",
    shopName: shop?.name ?? "the shop",
    neighborhood: shop?.neighborhood ?? "the area",
  };
}
