"use client";

import { useEffect } from "react";
import { useHydrated, useStore } from "@/lib/store";

/** Starts the onboarding timer on mount when none is running. */
export function useOnboardingTimer() {
  const hydrated = useHydrated();
  const startTimer = useStore((s) => s.startTimer);
  useEffect(() => {
    if (!hydrated) return;
    const timer = useStore.getState().timers?.onboarding;
    if (!timer || timer.stoppedAt !== undefined) startTimer("onboarding");
  }, [hydrated, startTimer]);
}
