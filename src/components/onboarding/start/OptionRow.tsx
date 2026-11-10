"use client";

import type { ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

/** One line of the start list: icon, title, time estimate, arrow. */
export function OptionRow({
  title,
  time,
  art,
  dimmed,
  busy,
  disabled,
  delay,
  onIntent,
  onPick,
}: {
  title: string;
  time: string;
  art: ReactNode;
  dimmed?: boolean;
  busy?: boolean;
  disabled?: boolean;
  delay: number;
  onIntent: () => void;
  onPick: () => void;
}) {
  return (
    <li className="animate-rise border-b border-border first:border-t motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }}>
      <button
        type="button"
        onClick={onPick}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        disabled={disabled}
        aria-busy={busy || undefined}
        className={`group flex w-full items-center gap-4 px-2 py-4 text-left text-foreground outline-none transition-[background-color,opacity] duration-200 hover:bg-card focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-inset sm:gap-6 sm:px-4 sm:py-6 ${dimmed ? "opacity-40" : ""}`}
      >
        {art}
        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="text-[22px] leading-tight font-semibold tracking-[-0.025em] sm:text-[32px]">{title}</span>
          <span className="font-mono text-[12px] tracking-wide text-muted-foreground uppercase tabular-nums sm:text-[13px]">
            {busy ? "Opening…" : time}
          </span>
        </span>
        <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 group-hover:text-foreground group-focus-visible:text-foreground">
          {busy ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <ArrowRight aria-hidden className="size-5 transition-transform duration-200 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1" />
          )}
        </span>
      </button>
    </li>
  );
}
