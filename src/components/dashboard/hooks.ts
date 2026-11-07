"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during the first client render, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function minuteTick(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/** Current time in epoch ms, rounded to the minute. 0 on the server, so markup matches on hydration. */
export function useMinuteClock(): number {
  return useSyncExternalStore(
    minuteTick,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}
