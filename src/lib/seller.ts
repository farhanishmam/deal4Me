"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useHydrated, useStore } from "./store";

// Which store the seller profile is managing. There are no accounts yet, so the
// choice is kept in this browser and defaults to the first live store.

const KEY = "deal4me-seller-shop";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function selectSellerShop(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* storage can be blocked */
  }
  listeners.forEach((callback) => callback());
}

export function useSellerShop() {
  const hydrated = useHydrated();
  const shops = useStore((s) => s.shops);
  const allItems = useStore((s) => s.items);
  const negotiations = useStore((s) => s.negotiations);
  const stored = useSyncExternalStore(subscribe, read, () => "");

  // A fresh phone opens on the store with the newest agreed deal, so its messages show up.
  const dealShopId = useMemo(() => {
    let best: { at: string; shopId: string } | undefined;
    for (const n of negotiations) {
      if (n.status !== "deal") continue;
      const shopId = allItems.find((i) => i.id === n.itemId)?.shopId;
      if (!shopId) continue;
      const at = n.rounds.at(-1)?.at ?? "";
      if (!best || at > best.at) best = { at, shopId };
    }
    return best?.shopId;
  }, [negotiations, allItems]);

  // Order: the stored choice, the newest deal's store, then a local seller's live store
  // (scanning and renting out gear is the main seller path), any live store, the first store.
  const shop =
    shops.find((x) => x.id === stored) ??
    shops.find((x) => x.id === dealShopId) ??
    shops.find((x) => x.liveAt && x.sellerKind === "local") ??
    shops.find((x) => x.liveAt) ??
    shops[0];
  const shopId = shop?.id;
  const items = useMemo(() => allItems.filter((i) => i.shopId === shopId), [allItems, shopId]);

  const selectShop = useCallback((id: string) => {
    selectSellerShop(id);
  }, []);

  return { hydrated, shop, items, shops, selectShop };
}
