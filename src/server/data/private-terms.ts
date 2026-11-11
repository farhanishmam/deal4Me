import type { DataState } from "@/lib/data-state";
import type { Item, PublicRentalTerms } from "@/lib/types";
import type { ItemInput, StoredItem } from "./schema";
import { DataError } from "./store";

/**
 * An item as any browser may see it. Two fields stay with the seller: a rental's private minimum, and
 * the price suggestion, because a sale item's floor is derived from the low end of that suggestion.
 */
export type PublicItem = Omit<Item, "rental" | "suggestion"> & { rental?: PublicRentalTerms };

export function publicItem(item: Item): PublicItem {
  const rest: Item = { ...item };
  delete rest.suggestion;
  const { rental } = item;
  if (!rental) return rest;
  const { dailyFeeCents, depositCents, maxDays, bindingCheckRequired } = rental;
  return { ...rest, rental: { dailyFeeCents, depositCents, maxDays, bindingCheckRequired } };
}

/** The workspace as buyer screens load it. Seller screens ask for `?view=seller` to get the private terms. */
export function publicDataState(state: DataState): Omit<DataState, "items"> & { items: PublicItem[] } {
  return { ...state, items: state.items.map(publicItem) };
}

/**
 * Buyer screens never load the private terms, and a seller screen may save before its seller view
 * arrives, so a save can leave them out. Keep the stored ones then: the price suggestion as it was (only
 * while the item keeps its kind, since a rental's suggestion is a daily rate), and
 * the private minimum lowered to the new daily fee when the fee drops below it (the schema requires
 * minimum ≤ daily fee).
 */
export function keepPrivateTerms(input: ItemInput, stored: StoredItem | undefined): StoredItem {
  const { rental, ...fields } = input;
  const suggestion = fields.suggestion ?? (stored?.kind === input.kind ? stored.suggestion : undefined);
  const rest = suggestion ? { ...fields, suggestion } : fields;
  if (!rental) return rest;
  let minDailyFeeCents = rental.minDailyFeeCents;
  if (minDailyFeeCents === undefined) {
    const storedMinimum = stored?.rental?.minDailyFeeCents;
    if (storedMinimum === undefined) throw new DataError(`Set a private minimum for ${input.name}.`);
    minDailyFeeCents = Math.min(storedMinimum, rental.dailyFeeCents);
  }
  return { ...rest, rental: { ...rental, minDailyFeeCents } };
}
