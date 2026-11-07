"use client";

import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { APP_TIME_ZONE } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Actor, StepEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const actorDot: Record<Actor, string> = {
  "Onboarding agent": "bg-info",
  "Storefront agent": "bg-success",
  "Deals agent": "bg-warning",
  "Visitor agent": "bg-primary",
  "Owner agent": "bg-foreground",
  Payments: "bg-success",
  System: "bg-muted-foreground",
};

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function clock(at: string) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : clockFormat.format(d);
}
function latency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}
function cost(usd: number) {
  return `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}`;
}

/**
 * Timeline of what the agents did. Reads stepLog from the store (newest first)
 * unless `events` is passed.
 */
export function StepLogList({
  events,
  limit,
  tone = "default",
  className,
}: {
  events?: StepEvent[];
  limit?: number;
  tone?: "default" | "ink";
  className?: string;
}) {
  const stored = useStore((s) => s.stepLog);
  const all = events ?? stored ?? [];
  const list = limit ? all.slice(0, limit) : all;
  const ink = tone === "ink";

  if (list.length === 0) {
    return (
      <EmptyState
        compact
        icon={<ListChecks />}
        title="Nothing yet"
        description="Agent steps appear here as they happen."
        className={cn(ink && "[&_p]:text-ink-foreground [&_p+p]:text-ink-muted", className)}
      />
    );
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {list.map((e) => (
        <li
          key={e.id}
          className={cn(
            "flex animate-rise gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0",
            ink ? "border-ink-border" : "border-border"
          )}
        >
          <span
            className={cn(
              "w-[62px] shrink-0 pt-0.5 font-mono text-xs tabular-nums",
              ink ? "text-ink-muted" : "text-muted-foreground"
            )}
          >
            {clock(e.at)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span
                className={cn(
                  "inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold whitespace-nowrap",
                  ink ? "bg-ink-raised text-ink-foreground" : "bg-muted text-foreground"
                )}
              >
                <span className={cn("size-1.5 rounded-full", actorDot[e.actor] ?? "bg-muted-foreground")} aria-hidden />
                {e.actor}
              </span>
              <span className={cn("text-sm font-medium", ink && "text-ink-foreground")}>{e.action}</span>
            </div>
            {e.detail && (
              <p className={cn("mt-1 text-sm", ink ? "text-ink-muted" : "text-muted-foreground")}>{e.detail}</p>
            )}
          </div>
          {(e.latencyMs !== undefined || e.costUsd !== undefined) && (
            <div
              className={cn(
                "shrink-0 text-right font-mono text-xs tabular-nums leading-5",
                ink ? "text-ink-muted" : "text-muted-foreground"
              )}
            >
              {e.latencyMs !== undefined && <div>{latency(e.latencyMs)}</div>}
              {e.costUsd !== undefined && <div>{cost(e.costUsd)}</div>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
