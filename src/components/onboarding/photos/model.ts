import type { Item, PriceSuggestion, SellerKind } from "@/lib/types";

export const MAX_PHOTOS = 12;

export type Mode = "rent" | "sell";

/** One grid cell. Prices are whole dollars, kept as text while the owner types. */
export interface Slot {
  src?: string;
  item?: Item;
  mode: Mode;
  rent: string;
  sale: string;
  saleSuggestion?: PriceSuggestion;
  pricing?: boolean;
  pricingError?: string;
}

export const emptySlot = (): Slot => ({ mode: "rent", rent: "", sale: "" });

const dollars = (cents: number) => String(Math.round(cents / 100));

export function slotFromItem(item: Item, src: string | undefined): Slot {
  const rent = item.rental ? dollars(item.rental.dailyFeeCents) : "";
  const sale = item.kind === "rental" ? "" : dollars(item.priceCents ?? item.suggestion?.amountCents ?? 0);
  return { src, item, mode: item.kind === "rental" ? "rent" : "sell", rent, sale, saleSuggestion: item.kind === "rental" ? undefined : item.suggestion };
}

const toCents = (text: string, fallback: number) => {
  const n = Number(text.replace(/[^0-9]/g, ""));
  return text.trim() === "" || !Number.isFinite(n) ? fallback : n * 100;
};

/** The item as the owner left it: mode and prices applied to the generated one. */
export function finalItem(slot: Slot, kind: SellerKind): Item | undefined {
  const base = slot.item;
  if (!base) return undefined;

  if (kind === "business") {
    const priceCents = toCents(slot.sale || dollars(base.priceCents ?? 0), base.priceCents ?? 0);
    return priceCents === base.priceCents ? base : { ...base, priceCents };
  }

  if (slot.mode === "sell") {
    const suggestion = slot.saleSuggestion;
    const { rental: _rental, ...rest } = base;
    void _rental;
    return { ...rest, kind: "sale", priceCents: toCents(slot.sale, suggestion?.amountCents ?? 0), suggestion };
  }

  if (!base.rental) return base;
  const dailyFeeCents = toCents(slot.rent, base.rental.dailyFeeCents);
  if (base.kind === "rental" && dailyFeeCents === base.rental.dailyFeeCents) return base;
  const ratio = base.rental.dailyFeeCents > 0 ? base.rental.minDailyFeeCents / base.rental.dailyFeeCents : 0.62;
  const minDailyFeeCents = Math.max(100, Math.round((dailyFeeCents * ratio) / 100) * 100);
  return {
    ...base,
    kind: "rental",
    rental: { ...base.rental, dailyFeeCents, minDailyFeeCents: Math.min(minDailyFeeCents, dailyFeeCents) },
  };
}
