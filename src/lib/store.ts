"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, type SeedState, type Timers } from "./mock-data";
import type {
  FoodOrder,
  Item,
  Negotiation,
  Rental,
  Shop,
  StepEvent,
  VisitorProfile,
} from "./types";

export const STORAGE_KEY = "ms2034";
const STEP_LOG_LIMIT = 300;

export type TimerName = "onboarding" | "deal";
export type { Timers };

/** Caller-supplied step. The store adds `id` and `at` when they are missing. */
export type StepInput = Omit<StepEvent, "id" | "at"> & { id?: string; at?: string };

export interface StoreState extends SeedState {
  /** Insert or replace by id. New shops and items go to the end of the list. */
  upsertShop: (shop: Shop) => void;
  upsertItem: (item: Item) => void;
  /** Insert or replace by id. New records go to the front (newest first). */
  upsertNegotiation: (negotiation: Negotiation) => void;
  upsertRental: (rental: Rental) => void;
  upsertOrder: (order: FoodOrder) => void;
  setVisitor: (patch: Partial<VisitorProfile>) => void;
  /** Adds an event at the front of stepLog. */
  logStep: (event: StepInput) => void;
  /** Starts (or restarts) a timer at the current time. Times are epoch milliseconds. */
  startTimer: (name: TimerName) => void;
  /** Stops a running timer. Does nothing when it is not running. */
  stopTimer: (name: TimerName) => void;
  /** Marks a shop live now and records how long onboarding took (stops the onboarding timer). */
  publishShop: (shopId: string) => void;
  /** Back to the fake data. */
  resetDemo: () => void;
}

function upsertById<T extends { id: string }>(list: T[], next: T, position: "start" | "end"): T[] {
  const index = list.findIndex((x) => x.id === next.id);
  if (index >= 0) {
    const copy = list.slice();
    copy[index] = next;
    return copy;
  }
  return position === "start" ? [next, ...list] : [...list, next];
}

let stepCounter = 0;
function newStepId() {
  stepCounter += 1;
  return `step-${Date.now().toString(36)}-${stepCounter}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),

      upsertShop: (shop) => set((s) => ({ shops: upsertById(s.shops, shop, "end") })),
      upsertItem: (item) => set((s) => ({ items: upsertById(s.items, item, "end") })),
      upsertNegotiation: (n) => set((s) => ({ negotiations: upsertById(s.negotiations, n, "start") })),
      upsertRental: (r) => set((s) => ({ rentals: upsertById(s.rentals, r, "start") })),
      upsertOrder: (o) => set((s) => ({ orders: upsertById(s.orders, o, "start") })),

      setVisitor: (patch) => set((s) => ({ visitor: { ...s.visitor, ...patch } })),

      logStep: (event) =>
        set((s) => {
          const full: StepEvent = {
            ...event,
            id: event.id ?? newStepId(),
            at: event.at ?? new Date().toISOString(),
          };
          return { stepLog: [full, ...s.stepLog].slice(0, STEP_LOG_LIMIT) };
        }),

      startTimer: (name) => set((s) => ({ timers: { ...s.timers, [name]: { startedAt: Date.now() } } })),

      stopTimer: (name) =>
        set((s) => {
          const timer = s.timers[name];
          if (!timer || timer.stoppedAt !== undefined) return s;
          return { timers: { ...s.timers, [name]: { ...timer, stoppedAt: Date.now() } } };
        }),

      publishShop: (shopId) => {
        const { shops, timers } = get();
        const shop = shops.find((x) => x.id === shopId);
        if (!shop) return;
        const timer = timers.onboarding;
        const stoppedAt = timer ? (timer.stoppedAt ?? Date.now()) : undefined;
        const seconds = timer && stoppedAt !== undefined ? Math.max(1, Math.round((stoppedAt - timer.startedAt) / 1000)) : undefined;
        set((s) => ({
          shops: upsertById(
            s.shops,
            { ...shop, liveAt: new Date().toISOString(), onboardingSeconds: seconds ?? shop.onboardingSeconds },
            "end",
          ),
          timers: timer && timer.stoppedAt === undefined ? { ...s.timers, onboarding: { ...timer, stoppedAt } } : s.timers,
        }));
      },

      resetDemo: () => set(buildSeed()),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // The StoreHydrator component rehydrates on mount, so the server and the
      // first client render both show the seed data.
      skipHydration: true,
      partialize: (s) => ({
        shops: s.shops,
        items: s.items,
        negotiations: s.negotiations,
        rentals: s.rentals,
        orders: s.orders,
        stepLog: s.stepLog,
        visitor: s.visitor,
        timers: s.timers,
      }),
      // Older saved data is dropped in favor of the current seed.
      migrate: () => buildSeed() as unknown as StoreState,
    },
  ),
);

/** True once the saved state has been loaded in the browser. False on the server. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

// Small lookups, for components that only need one record.
export const useShop = (id: string | undefined) => useStore((s) => s.shops.find((x) => x.id === id));
export const useItem = (id: string | undefined) => useStore((s) => s.items.find((x) => x.id === id));
export const getShop = (id: string | undefined) => useStore.getState().shops.find((x) => x.id === id);
export const getItem = (id: string | undefined) => useStore.getState().items.find((x) => x.id === id);
