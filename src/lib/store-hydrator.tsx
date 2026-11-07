"use client";

import { useEffect } from "react";
import { STORAGE_KEY, useStore } from "./store";

/**
 * Loads the saved state on mount, then reloads it whenever another window or
 * iframe changes it. This is what keeps the two phones in table mode in sync.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      // key is null when storage was cleared.
      if (event.key === STORAGE_KEY || event.key === null) {
        void useStore.persist.rehydrate();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
