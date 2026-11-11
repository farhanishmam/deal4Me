"use client";

import { useEffect } from "react";
import { useHydrated, useStore } from "@/lib/store";

// A clock left running by an abandoned onboarding is too old to time this one.
const STALE_MS = 60 * 60_000;

/** Starts the onboarding timer on mount unless a recent one is running. */
export function useOnboardingTimer() {
  const hydrated = useHydrated();
  const startTimer = useStore((s) => s.startTimer);
  useEffect(() => {
    if (!hydrated) return;
    const timer = useStore.getState().timers?.onboarding;
    if (!timer || timer.stoppedAt !== undefined || Date.now() - timer.startedAt > STALE_MS) startTimer("onboarding");
  }, [hydrated, startTimer]);
}
