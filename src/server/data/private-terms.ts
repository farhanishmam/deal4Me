import type { DataState } from "@/lib/data-state";
import type { Item, PublicRentalTerms } from "@/lib/types";
import type { ItemInput, StoredItem } from "./schema";
import { DataError } from "./store";

/** An item with the owner's private minimum taken out, safe for any browser. */
export type PublicItem = Omit<Item, "rental"> & { rental?: PublicRentalTerms };

export function publicItem(item: Item): PublicItem {
  if (!item.rental) return item;
  const { dailyFeeCents, depositCents, maxDays, bindingCheckRequired } = item.rental;
  return { ...item, rental: { dailyFeeCents, depositCents, maxDays, bindingCheckRequired } };
}

/** The workspace as buyer screens load it. Seller screens ask for `?view=seller` to get the private minimum. */
export function publicDataState(state: DataState): Omit<DataState, "items"> & { items: PublicItem[] } {
  return { ...state, items: state.items.map(publicItem) };
}

/**
 * Buyer screens never load the private minimum, and a seller screen may save before its seller view
 * arrives, so a save can leave it out. Keep the stored minimum then, lowered to the new daily fee
 * when the fee drops below it (the schema requires minimum ≤ daily fee).
 */
export function keepPrivateTerms(input: ItemInput, stored: StoredItem | undefined): StoredItem {
  const { rental, ...rest } = input;
  if (!rental) return rest;
  let minDailyFeeCents = rental.minDailyFeeCents;
  if (minDailyFeeCents === undefined) {
    const storedMinimum = stored?.rental?.minDailyFeeCents;
    if (storedMinimum === undefined) throw new DataError(`Set a private minimum for ${input.name}.`);
    minDailyFeeCents = Math.min(storedMinimum, rental.dailyFeeCents);
  }
  return { ...rest, rental: { ...rental, minDailyFeeCents } };
}
