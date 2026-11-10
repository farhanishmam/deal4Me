"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { type DataView, loadDataState } from "./real/catalog";
import { getPendingOrderIds, retryPendingOrderSaves } from "./order-sync";
import { getPendingShopIds, retryPendingShopSaves } from "./shop-sync";
import { STORAGE_KEY, useStore } from "./store";
import type { Negotiation } from "./types";

/** Keep a response started before a local save from erasing that newer edit. */
function mergeRemote<T extends { id: string }>(remote: T[], before: T[], current: T[], pending = new Set<string>()): T[] {
  const beforeById = new Map(before.map((record) => [record.id, record]));
  const newer = current.filter((record) => pending.has(record.id) || beforeById.get(record.id) !== record);
  const newerIds = new Set(newer.map((record) => record.id));
  return [...remote.filter((record) => !newerIds.has(record.id)), ...newer];
}

/**
 * Load server records on every device; local storage only keeps visitor preferences.
 * `view` is "seller" only on seller screens, so buyer screens never receive a private minimum.
 */
export function StoreHydrator({ view }: { view: DataView }) {
  const viewRef = useRef(view);
  const refreshRef = useRef<() => Promise<void>>(undefined);

  // Moving between buyer and seller screens reloads the catalog in the matching view.
  useEffect(() => {
    if (viewRef.current === view) return;
    viewRef.current = view;
    void refreshRef.current?.();
  }, [view]);

  useEffect(() => {
    let active = true;
    let loading = false;
    let again = false;
    let lastError = "";

    const refresh = async () => {
      if (!active) return;
      if (loading) {
        again = true;
        return;
      }
      loading = true;
      const before = useStore.getState();
      const requested = viewRef.current;
      try {
        const [data, dealsResponse] = await Promise.all([
          loadDataState(requested),
          fetch("/api/deals/negotiations", { cache: "no-store" }),
        ]);
        if (!dealsResponse.ok) throw new Error("Could not load negotiations");
        const { negotiations } = await dealsResponse.json() as { negotiations: Negotiation[] };
        if (!active) return;
        // The screen switched views mid-request: drop this response and load the right one.
        if (requested !== viewRef.current) {
          again = true;
          return;
        }
        useStore.setState((current) => ({
          shops: mergeRemote(data.shops, before.shops, current.shops, new Set(getPendingShopIds())),
          items: mergeRemote(data.items, before.items, current.items),
          orders: mergeRemote(data.orders, before.orders, current.orders, new Set(getPendingOrderIds())),
          rentals: mergeRemote(data.rentals, before.rentals, current.rentals),
          itemRequests: mergeRemote(data.itemRequests, before.itemRequests, current.itemRequests),
          negotiations: mergeRemote(negotiations, before.negotiations, current.negotiations),
          dataLoaded: true,
          syncError: getPendingShopIds().size || getPendingOrderIds().size ? current.syncError : null,
        }));
        lastError = "";
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Could not connect to the backend";
        useStore.setState({ syncError: message, dataLoaded: true });
        if (message !== lastError) toast.error(message);
        lastError = message;
      } finally {
        loading = false;
        if (again && active) {
          again = false;
          void refresh();
        }
      }
    };
    refreshRef.current = refresh;

    void Promise.resolve(useStore.persist.rehydrate()).then(refresh);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        void Promise.resolve(useStore.persist.rehydrate()).then(refresh);
      }
    };

    const onFocus = () => { void refresh(); };
    const onOnline = () => { void Promise.all([retryPendingShopSaves(), retryPendingOrderSaves()]).then(refresh); };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      refreshRef.current = undefined;
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
