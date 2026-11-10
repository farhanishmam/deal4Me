import { APP_TIME_ZONE, shortDate } from "@/lib/format";
import type { FoodOrder, Rental } from "@/lib/types";

export interface EarningsPoint {
  /** "Nov 6" */
  label: string;
  cents: number;
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });

function keyOf(ms: number): string {
  return Number.isFinite(ms) ? dayKey.format(new Date(ms)) : "";
}

/** What a rental has really earned: the captured amount once it is settled, else nothing yet. */
function rentalEarned(r: Rental): number {
  if (r.status === "settled") return r.capturedCents ?? r.dailyFeeCents * r.days;
  if (r.status === "returned") return r.dailyFeeCents * r.days;
  return 0;
}

/**
 * Whole days of real earnings, oldest first, ending today. Only collected
 * money counts: food orders that were picked up and rentals that came back.
 * `now` is epoch ms from the clock hook; before it is known the series is empty.
 */
export function buildSeries(orders: FoodOrder[], rentals: Rental[], now: number, days = 30): EarningsPoint[] {
  if (!now) return [];
  const totals = new Map<string, number>();
  const add = (ms: number, cents: number) => {
    if (cents <= 0) return;
    const k = keyOf(ms);
    totals.set(k, (totals.get(k) ?? 0) + cents);
  };
  for (const o of orders) if (o.status === "picked_up") add(Date.parse(o.pickupTime), o.totalCents);
  for (const r of rentals) add(Math.min(Date.parse(r.returnBy), now), rentalEarned(r));

  return Array.from({ length: days }, (_, i) => {
    const ms = now - (days - 1 - i) * 86_400_000;
    return { label: shortDate(new Date(ms).toISOString()), cents: totals.get(keyOf(ms)) ?? 0 };
  });
}

const sum = (points: EarningsPoint[]) => points.reduce((total, p) => total + p.cents, 0);

/** This week's total (last 7 days) and the change against the 7 days before. */
export function weekStats(points: EarningsPoint[]) {
  const thisWeek = sum(points.slice(-7));
  const before = sum(points.slice(-14, -7));
  const deltaPct = before > 0 ? Math.round(((thisWeek - before) / before) * 100) : 0;
  return { thisWeek, deltaPct };
}
