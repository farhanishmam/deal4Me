import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = string | { label: string; hint?: string };

/**
 * Done, active and pending steps. `current` is the 0-based active step.
 * Pass current >= steps.length to mark everything done.
 */
export function ProgressSteps({
  steps,
  current,
  orientation = "horizontal",
  tone = "default",
  className,
}: {
  steps: Step[];
  current: number;
  orientation?: "horizontal" | "vertical";
  tone?: "default" | "ink";
  className?: string;
}) {
  const ink = tone === "ink";
  const vertical = orientation === "vertical";
  return (
    <ol className={cn("flex", vertical ? "flex-col" : "items-start", className)}>
      {steps.map((step, i) => {
        const label = typeof step === "string" ? step : step.label;
        const hint = typeof step === "string" ? undefined : step.hint;
        const state = i < current ? "done" : i === current ? "active" : "pending";
        const last = i === steps.length - 1;
        return (
          <li
            key={label + i}
            aria-current={state === "active" ? "step" : undefined}
            className={cn("flex", vertical ? "gap-3" : "flex-1 flex-col gap-2", last && !vertical && "flex-none")}
          >
            <div className={cn("flex items-center", vertical ? "flex-col" : "gap-2")}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-300",
                  state === "done" && (ink ? "bg-ink-foreground text-ink" : "bg-ink text-ink-foreground"),
                  state === "active" && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  state === "pending" &&
                    (ink ? "border border-ink-border text-ink-muted" : "border border-border bg-card text-muted-foreground")
                )}
              >
                {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "rounded-full transition-colors duration-300",
                    vertical ? "my-1 min-h-6 w-px flex-1" : "h-px min-w-6 flex-1",
                    i < current ? (ink ? "bg-ink-foreground/60" : "bg-ink") : ink ? "bg-ink-border" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className={cn(vertical ? "pb-5 leading-tight" : "pr-3 leading-tight")}>
              <p
                className={cn(
                  "text-sm",
                  state === "pending"
                    ? ink ? "font-medium text-ink-muted" : "font-medium text-muted-foreground"
                    : "font-semibold"
                )}
              >
                {label}
              </p>
              {hint && (
                <p className={cn("mt-0.5 text-xs", ink ? "text-ink-muted" : "text-muted-foreground")}>{hint}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
