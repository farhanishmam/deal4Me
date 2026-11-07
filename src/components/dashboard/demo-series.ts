import { shortDate, zonedIso } from "@/lib/format";

/**
 * Local demo series for the Earnings chart: whole dollars per day, oldest first,
 * ending with today. Live orders that
 * reach "picked up" are added on top by `buildSeries`.
 */
const DAILY_DOLLARS = [
  176, 184, 170, 192, 214, 236, 228, 198, 205, 190, 208, 226, 248, 240, 212,
  220, 206, 224, 246, 268, 262, 232, 238, 226, 254, 278, 304, 296, 276, 288,
];

export interface EarningsPoint {
  /** "Nov 6" */
  label: string;
  cents: number;
}

/** `now` is epoch ms from the clock hook. Before it is known (server render) the labels stay empty. */
export function buildSeries(
  todayExtraCents: number,
  now: number,
): EarningsPoint[] {
  const last = DAILY_DOLLARS.length - 1;
  const from = new Date(now);
  return DAILY_DOLLARS.map((dollars, i) => ({
    label: now ? shortDate(zonedIso(i - last, 12, 0, from)) : "",
    cents: dollars * 100 + (i === last ? todayExtraCents : 0),
  }));
}

const sum = (points: EarningsPoint[]) =>
  points.reduce((total, p) => total + p.cents, 0);

/** This week's total (last 7 days) and the change against the 7 days before. */
export function weekStats(points: EarningsPoint[]) {
  const thisWeek = sum(points.slice(-7));
  const before = sum(points.slice(-14, -7));
  const deltaPct =
    before > 0 ? Math.round(((thisWeek - before) / before) * 100) : 0;
  return { thisWeek, deltaPct };
}
