"use client";

import { useEffect, useState } from "react";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MS_PER_CHAR = 18;
const MAX_REVEAL_MS = 900;
const TICK_MS = 30;

/**
 * How many leading characters of `text` to show. A live bubble reveals its text
 * once over at most MAX_REVEAL_MS; anything else (or reduced motion) shows it all.
 * Whether to animate is decided at mount and never again, so a bubble that stops
 * being the latest one finishes its reveal and a re-render never restarts it.
 */
function useReveal(text: string, live: boolean): number {
  const [total] = useState(() => Array.from(text).length);
  const [animate] = useState(
    () =>
      live &&
      total > 0 &&
      !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );
  const [count, setCount] = useState(() => (animate ? 0 : Infinity));

  useEffect(() => {
    if (!animate) return;
    const step = Math.min(MS_PER_CHAR, MAX_REVEAL_MS / total);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = Math.floor((Date.now() - startedAt) / step);
      if (next >= total) {
        clearInterval(timer);
        setCount(Infinity);
      } else {
        setCount(next);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [animate, total]);

  return count;
}

/** One round of the haggle: the other side on the left, the visitor on the right. */
export function Bubble({
  side,
  name,
  price,
  message,
  typing = false,
  status,
  live = false,
}: {
  side: "owner" | "visitor";
  name: string;
  price?: string;
  message?: string;
  typing?: boolean;
  /** Small label beside the typing dots, e.g. "Thinking…". */
  status?: string;
  /** Reveal the message progressively on mount. The price shows at once. */
  live?: boolean;
}) {
  const mine = side === "visitor";
  const text = message ?? "";
  const revealed = useReveal(text, live && !typing);
  const chars = Array.from(text);
  const avatar = mine ? (
    <span className="mt-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-info text-white">
      <Sparkles className="size-[18px]" aria-hidden />
    </span>
  ) : (
    <span className="mt-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
      <User className="size-[18px]" aria-hidden />
    </span>
  );
  return (
    <div className={cn("flex animate-rise items-start gap-2.5", mine ? "justify-end" : "justify-start")}>
      {!mine && avatar}
      <div className={cn("flex w-[272px] max-w-[calc(100%-3rem)] min-w-0 flex-col gap-0.5", mine ? "items-end" : "items-start")}>
        <span className="px-1 text-[13px] leading-[14px] text-muted-foreground">{name}</span>
        <div
          className={cn(
            "rounded-2xl px-4 text-foreground",
            typing ? "w-fit py-3.5" : "w-full py-1.5",
            mine ? "bg-info-soft" : "bg-muted"
          )}
        >
          {typing ? (
            <span className="flex items-center gap-2" role="status" aria-label={status ?? "Typing"}>
              <span className="flex items-center gap-1" aria-hidden>
                {[0, 160, 320].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
              {status && (
                <span className="text-[13px] leading-4 text-muted-foreground" aria-hidden>
                  {status}
                </span>
              )}
            </span>
          ) : (
            <>
              <p className="text-[20px] leading-[22px] font-bold tracking-[-0.012em] tabular-nums">{price}</p>
              <p className="text-[15px] leading-[19px] [overflow-wrap:anywhere]">
                {revealed >= chars.length ? (
                  text
                ) : (
                  <>
                    <span className="sr-only">{text}</span>
                    <span aria-hidden>{chars.slice(0, revealed).join("")}</span>
                    <span aria-hidden className="invisible">
                      {chars.slice(revealed).join("")}
                    </span>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
      {mine && avatar}
    </div>
  );
}
