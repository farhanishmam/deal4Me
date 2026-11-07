"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const btn =
    "flex h-full w-10 items-center justify-center text-foreground transition-colors duration-150 hover:bg-muted active:bg-muted focus-visible:outline-none focus-visible:bg-primary-soft disabled:pointer-events-none disabled:text-muted-foreground/50 [&_svg]:size-4";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
    >
      <button
        type="button"
        className={btn}
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </button>
      <span
        className="flex min-w-9 items-center justify-center border-x border-border px-1 text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </button>
    </div>
  );
}
