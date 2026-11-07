"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export type Cart = Record<string, number>;

/**
 * The order lives in this browser, per shop, under "ms2034-cart:<shopId>"
 * as { [itemId]: quantity }. Preview mode keeps it in memory only.
 */
export const cartKey = (shopId: string) => `ms2034-cart:${shopId}`;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): Cart {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as Cart) : {};
  } catch {
    return {};
  }
}

export function useCart(shopId: string, persist: boolean) {
  const key = cartKey(shopId);
  const [memory, setMemory] = useState<Cart>({});
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "",
  );
  const stored = useMemo(() => parse(raw), [raw]);
  const cart = persist ? stored : memory;

  const add = useCallback(
    (itemId: string, qty: number) => {
      if (!persist) {
        setMemory((c) => ({ ...c, [itemId]: Math.min(99, (c[itemId] ?? 0) + qty) }));
        return;
      }
      const current = parse(read(key));
      const next = { ...current, [itemId]: Math.min(99, (current[itemId] ?? 0) + qty) };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage can be blocked */
      }
      listeners.forEach((cb) => cb());
    },
    [persist, key],
  );

  return { cart, add };
}
