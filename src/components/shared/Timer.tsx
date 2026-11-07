"use client";

import { useSyncExternalStore } from "react";
import { duration } from "@/lib/format";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// One shared clock so every Timer on screen ticks together.
let now = 0;
const listeners = new Set<() => void>();
let handle: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  now = Date.now();
  if (!handle) {
    handle = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 250);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && handle) {
      clearInterval(handle);
      handle = undefined;
    }
  };
}
const getNow = () => (now || (now = Date.now()));
const getServerNow = () => 0;

function toMs(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? undefined : t;
  }
  return undefined;
}

const sizes = {
  sm: "text-sm font-semibold",
  md: "text-heading",
  lg: "text-metric",
} as const;

/** Live elapsed time for a store timer. Reads timers[name] and ticks while it runs. */
export function Timer({
  name,
  size = "md",
  tone = "default",
  showDot = true,
  className,
}: {
  name: "onboarding" | "deal";
  size?: keyof typeof sizes;
  /** "ink" for dark panels. */
  tone?: "default" | "ink";
  showDot?: boolean;
  className?: string;
}) {
  const timer = useStore((s) => s.timers?.[name]);
  const tick = useSyncExternalStore(subscribe, getNow, getServerNow);

  const start = toMs(timer?.startedAt);
  const stop = toMs(timer?.stoppedAt);
  const running = start !== undefined && stop === undefined;
  const elapsed = start === undefined ? 0 : (stop ?? tick) - start;
  const ink = tone === "ink";

  return (
    <span
      role="timer"
      className={cn(
        "inline-flex items-center gap-2 tabular-nums",
        sizes[size],
        start === undefined && (ink ? "text-ink-muted" : "text-muted-foreground"),
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            running ? "animate-pulse bg-primary" : stop !== undefined ? "bg-success" : ink ? "bg-ink-border" : "bg-border"
          )}
        />
      )}
      {duration(elapsed / 1000)}
    </span>
  );
}
