import type { Cents, Condition } from "./types";

// Every date in the prototype is shown in Salt Lake City time, so the server
// and the browser always print the same thing.
export const APP_TIME_ZONE = "America/Denver";

const wholeFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fractionFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 4000 -> "$40", 4150 -> "$41.50". Cents only appear when they are not zero. */
export function money(cents: Cents): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  const dollars = abs / 100;
  return `${sign}$${abs % 100 === 0 ? wholeFormat.format(dollars) : fractionFormat.format(dollars)}`;
}

/** 6000 -> "$60/day" */
export function perDay(cents: Cents): string {
  return `${money(cents)}/day`;
}

const CONDITION_LABELS: Record<Condition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  used: "Used",
};

export function conditionLabel(condition: Condition | undefined): string {
  return condition ? (CONDITION_LABELS[condition] ?? "") : "";
}

/** "order-seed-1" -> "#2038". A short, stable number for showing any order ID. */
export function orderNumber(id: string): string {
  const seed = id.match(/^order-seed-(\d+)$/);
  if (seed) return `#${2039 - Number(seed[1])}`;
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 960;
  return `#${2040 + hash}`;
}

/** 92 -> "1:32", 3725 -> "1:02:05" */
export function duration(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function toDate(iso: string): Date | undefined {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** "2026-11-07T19:00:00.000Z" -> "Nov 7". Anything that is not a date comes back unchanged. */
export function shortDate(iso: string): string {
  const d = toDate(iso);
  return d ? dateFormat.format(d) : iso;
}

/** "2026-11-07T19:00:00.000Z" -> "12:00 PM". Anything that is not a date comes back unchanged. */
export function clockTime(iso: string): string {
  const d = toDate(iso);
  return d ? timeFormat.format(d) : iso;
}

/** "Nov 7 to Nov 11" */
export function dateRange(startIso: string, endIso: string): string {
  return `${shortDate(startIso)} to ${shortDate(endIso)}`;
}

/** Whole days between two ISO dates, at least 1. */
export function daysBetween(startIso: string, endIso: string): number {
  const a = toDate(startIso);
  const b = toDate(endIso);
  if (!a || !b) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

// ---------------------------------------------------------------------------
// Fixed-hour dates for seed data. These only depend on the current day, so the
// server and the browser build identical values.
// ---------------------------------------------------------------------------

const zoneParts = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsAt(ms: number) {
  const out: Record<string, number> = {};
  for (const p of zoneParts.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

/** The instant whose Salt Lake wall clock reads `want` (a Date.UTC of those fields). */
function fromWallClock(want: number): number {
  let ms = want;
  for (let i = 0; i < 2; i++) {
    const p = partsAt(ms);
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ms += want - wall;
  }
  // A time skipped by the spring-forward change has no instant; move it forward, as browsers do.
  const p = partsAt(ms);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return wall === want ? ms : ms + (want - wall);
}

/**
 * ISO string for a wall-clock time in Salt Lake City, `dayOffset` days from
 * today (0 = today, 1 = tomorrow, -1 = yesterday).
 */
export function zonedIso(dayOffset: number, hour: number, minute = 0, from: Date = new Date()): string {
  const today = partsAt(from.getTime());
  return new Date(fromWallClock(Date.UTC(today.year, today.month - 1, today.day + dayOffset, hour, minute))).toISOString();
}

// datetime-local and date inputs have no zone, so their values are read and
// written as Salt Lake wall-clock times to match every other date on screen.

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "2026-11-07T19:00:00.000Z" -> "2026-11-07T12:00". Empty for anything that is not a date. */
export function toZonedInput(iso: string | undefined): string {
  const d = iso ? toDate(iso) : undefined;
  if (!d) return "";
  const p = partsAt(d.getTime());
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "2026-11-07T12:00" (Salt Lake time) -> "2026-11-07T19:00:00.000Z". Undefined when it does not parse. */
export function fromZonedInput(local: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return undefined;
  const ms = fromWallClock(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}
