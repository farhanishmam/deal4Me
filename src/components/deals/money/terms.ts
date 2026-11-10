"use client";

import { useSyncExternalStore } from "react";
import { clockTime, money, shortDate } from "@/lib/format";
import { useHydrated, useStore } from "@/lib/store";
import type { Cents, Item, Rental } from "@/lib/types";

/** Every money number on every screen comes from here, so they always agree. */
export function feeOf(r: Pick<Rental, "days" | "dailyFeeCents">): Cents {
  return r.days * r.dailyFeeCents;
}

export function holdOf(r: Pick<Rental, "days" | "dailyFeeCents" | "depositCents">): Cents {
  return feeOf(r) + r.depositCents;
}

/** "Nov 7 · 12:00 PM" */
export function when(iso: string): string {
  return `${shortDate(iso)} · ${clockTime(iso)}`;
}

/** Rental by id, plus whether the saved state has loaded yet. */
export function useRental(id: string) {
  const hydrated = useHydrated();
  const rental = useStore((s) => s.rentals.find((r) => r.id === id));
  return { hydrated, rental };
}

const tick = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};

/** Epoch ms rounded to the minute. 0 on the server so the first render matches. */
export function useNow(): number {
  return useSyncExternalStore(
    tick,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}

/** "1d 5h left", "3h 20m left", "Overdue". Empty until the clock is running. */
export function timeLeft(returnBy: string, now: number): string {
  if (!now) return "";
  const ms = Date.parse(returnBy) - now;
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Overdue";
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/** 482915 -> "482 915" */
export function codeGroups(code: string): string {
  return /^\d{6}$/.test(code) ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** The listing photos of an item, de-duplicated. */
export function itemPhotos(item: Item | undefined): string[] {
  return [...new Set([item?.photoUrl, ...(item?.photoUrls ?? [])].filter((src): src is string => Boolean(src)))];
}

/**
 * Three sample photos of the item, so a photo step works with one tap. They are the
 * item's own listing photos, repeated to three. With scratch on, the third carries
 * "?scratch=1" so the photo step paints scratch marks on it (rasterize strips the query).
 */
export function samplePhotos(item: Item | undefined, scratch = false): string[] {
  const own = itemPhotos(item);
  if (!own.length) return [];
  const three = [0, 1, 2].map((i) => own[i % own.length]);
  if (scratch) three[2] = `${three[2]}?scratch=1`;
  return three;
}

export { money };
