"use client";

import { useEffect } from "react";
import { MESSAGES_KEY, useMessages } from "@/lib/messages";

const POLL_MS = 3000;

/**
 * Loads saved messages from this browser, then from the server, and keeps them live:
 * other tabs through storage events, and other devices by polling while this tab is visible.
 */
export function MessagesSync() {
  useEffect(() => {
    let stopped = false;
    let busy = false;

    const sync = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        await useMessages.getState().loadFromServer();
        useMessages.getState().flush();
      } catch {
        // Offline or the server is restarting. The next tick tries again.
      } finally {
        busy = false;
      }
    };

    void Promise.resolve(useMessages.persist.rehydrate()).then(sync);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MESSAGES_KEY) void useMessages.persist.rehydrate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
