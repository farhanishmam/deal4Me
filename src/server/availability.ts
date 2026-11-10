import type { Item, ItemRequestInput } from "@/lib/types";

export const DAY_MS = 86_400_000;

function normalizedSize(size: string): string {
  const compact = size.trim().toLocaleLowerCase().replace(/\s+/g, "");
  const clothing: Record<string, string> = { extrasmall: "xs", small: "s", medium: "m", large: "l", extralarge: "xl", doubleextralarge: "xxl" };
  return clothing[compact] ?? compact;
}

/** Unset dates and sizes remain unspecified; they are never filled with demo values. */
export function availabilityIssue(item: Item, input: Omit<ItemRequestInput, "itemId">): string | undefined {
  if (!item.available) return "This item is currently unavailable. Ask the owner about another time.";
  const now = Date.now();
  const start = input.startsAt ? Date.parse(input.startsAt) : undefined;
  const end = input.endsAt ? Date.parse(input.endsAt) : undefined;
  if (start !== undefined && !Number.isFinite(start)) return "Choose a valid start time.";
  if (end !== undefined && !Number.isFinite(end)) return "Choose a valid end time.";
  if (end !== undefined && start === undefined) return "Choose a start time before an end time.";
  if (start !== undefined && end !== undefined && end <= start) return "The end time must be after the start time.";
  if (start !== undefined && start < now - 60_000) return "Choose a start time in the future.";
  if (item.availableFrom && start !== undefined && start < Date.parse(item.availableFrom)) return "Your requested time is before this item becomes available.";
  if (item.availableUntil && ((end ?? start ?? now) > Date.parse(item.availableUntil))) return "Your requested time is after this item's availability ends.";
  if (item.kind === "rental" && item.rental && start !== undefined && end !== undefined && Math.ceil((end - start) / DAY_MS) > item.rental.maxDays) return `This item rents for up to ${item.rental.maxDays} days.`;
  if (input.size && item.sizes?.length && !item.sizes.some((size) => normalizedSize(size) === normalizedSize(input.size!))) return "That size is not listed. Choose one of the available sizes.";
  return undefined;
}
