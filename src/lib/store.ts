"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { emptyState, type AppState, type Timers } from "./data-state";
import { withGearPhoto } from "./gear-photos";
import { toast } from "sonner";
import { configureShopSync, flushPendingShopSave, getPendingShopIds, queueShopSave, runShopMutation, ingestServerShop } from "./shop-sync";
import { configureOrderSync, getPendingOrderIds, queueOrderStatus } from "./order-sync";
import type {
  FoodOrder,
  Item,
  ItemRequest,
  Negotiation,
  Rental,
  Shop,
  StepEvent,
  VisitorProfile,
} from "./types";

export const STORAGE_KEY = "ridge-live";
const STEP_LOG_LIMIT = 300;

export type TimerName = "onboarding" | "deal";
export type { Timers };

/** Caller-supplied step. The store adds `id` and `at` when they are missing. */
export type StepInput = Omit<StepEvent, "id" | "at"> & { id?: string; at?: string };

export interface StoreState extends AppState {
  dataLoaded: boolean;
  syncError: string | null;
  /** Insert or replace by id. New shops and items go to the end of the list. */
  upsertShop: (shop: Shop) => void;
  upsertItem: (item: Item) => void;
  upsertItemRequest: (request: ItemRequest) => void;
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
  /** Publishes a draft. `timed: false` (studio) leaves the onboarding timer alone and records no time to go live. */
  publishShop: (shopId: string, opts?: { timed?: boolean }) => Promise<void>;
  /** Clears local preferences and reloads the server records. */
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
      ...emptyState(),
      dataLoaded: false,
      syncError: null,

      upsertShop: (shop) => {
        const current = get().shops.find((entry) => entry.id === shop.id);
        if (current && JSON.stringify(current) === JSON.stringify(shop)) return;
        set((s) => ({ shops: upsertById(s.shops, shop, "end") }));
        queueShopSave(shop);
      },
      upsertItem: (item) => set((s) => ({ items: upsertById(s.items, withGearPhoto(item), "end") })),
      upsertItemRequest: (request) => set((s) => ({ itemRequests: upsertById(s.itemRequests, request, "start") })),
      upsertNegotiation: (n) => set((s) => ({ negotiations: upsertById(s.negotiations, n, "start") })),
      upsertRental: (r) => set((s) => ({ rentals: upsertById(s.rentals, r, "start") })),
      upsertOrder: (order) => {
        const current = get().orders.find((entry) => entry.id === order.id);
        set((s) => ({ orders: upsertById(s.orders, order, "start") }));
        // New orders and canonical API responses already exist on the server.
        if (current && current.status !== order.status) queueOrderStatus(order);
      },

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

      publishShop: async (shopId, opts) => {
        const { shops, timers } = get();
        const shop = shops.find((x) => x.id === shopId);
        if (!shop) return;
        const timer = opts?.timed === false ? undefined : timers.onboarding;
        const stoppedAt = timer ? (timer.stoppedAt ?? Date.now()) : undefined;
        const elapsed = timer && stoppedAt !== undefined ? Math.max(1, Math.round((stoppedAt - timer.startedAt) / 1000)) : undefined;
        // A stale clock must never block publishing; the server rejects anything over a day.
        const seconds = elapsed !== undefined && elapsed <= 86400 ? elapsed : undefined;
        try {
          await flushPendingShopSave(shopId);
          const saved = await runShopMutation(shopId, async () => {
            const response = await fetch(`/api/data/shops/${encodeURIComponent(shopId)}/publish`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ onboardingSeconds: seconds }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) throw new Error(body?.error ?? "Could not publish this shop");
            return body as Shop;
          });
          ingestServerShop(saved);
          set((s) => ({
            syncError: getPendingShopIds().size === 0 && getPendingOrderIds().size === 0 ? null : s.syncError,
            timers: timer && timer.stoppedAt === undefined && s.timers.onboarding?.startedAt === timer.startedAt
              ? { ...s.timers, onboarding: { ...timer, stoppedAt } }
              : s.timers,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not publish this shop";
          set({ syncError: message });
          toast.error(message, { action: { label: "Retry", onClick: () => { void get().publishShop(shopId, opts); } } });
          get().logStep({ actor: "System", action: "Publishing failed", detail: message });
        }
      },

      resetDemo: () => set({ ...emptyState(), dataLoaded: false, syncError: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Catalog and transactions come from the server, never cached demo data.
      skipHydration: true,
      partialize: (s) => ({ stepLog: s.stepLog, visitor: s.visitor, timers: s.timers }),
      migrate: () => emptyState() as unknown as StoreState,
    },
  ),
);

configureShopSync({
  ingest: (shop) => useStore.setState((state) => ({ shops: upsertById(state.shops, shop, "end") })),
  onError: (message, retry) => {
    useStore.setState({ syncError: message });
    toast.error(message, { action: { label: "Retry", onClick: retry } });
    useStore.getState().logStep({ actor: "System", action: "Shop changes were not saved", detail: message });
  },
  onSaved: () => {
    if (getPendingShopIds().size === 0 && getPendingOrderIds().size === 0) useStore.setState({ syncError: null });
  },
});

configureOrderSync({
  ingest: (order) => useStore.setState((state) => ({ orders: upsertById(state.orders, order, "start") })),
  onError: (message, retry) => {
    useStore.setState({ syncError: message });
    toast.error(message, retry ? { action: { label: "Retry", onClick: retry } } : undefined);
    useStore.getState().logStep({ actor: "System", action: "Order status was not saved", detail: message });
  },
  onSaved: () => {
    if (getPendingShopIds().size === 0 && getPendingOrderIds().size === 0) useStore.setState({ syncError: null });
  },
});

/** True once the saved state has been loaded in the browser. False on the server. */
export function useHydrated(): boolean {
  const localReady = useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
  return useStore((s) => s.dataLoaded) && localReady;
}

// Small lookups, for components that only need one record.
export const useShop = (id: string | undefined) => useStore((s) => s.shops.find((x) => x.id === id));
export const useItem = (id: string | undefined) => useStore((s) => s.items.find((x) => x.id === id));
export const getShop = (id: string | undefined) => useStore.getState().shops.find((x) => x.id === id);
export const getItem = (id: string | undefined) => useStore.getState().items.find((x) => x.id === id);
