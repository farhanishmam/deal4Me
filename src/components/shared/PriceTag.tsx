import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { amount: "text-sm font-semibold", unit: "text-xs" },
  md: { amount: "text-[15px] font-semibold", unit: "text-xs" },
  lg: { amount: "text-heading", unit: "text-sm" },
  xl: { amount: "text-metric", unit: "text-sm" },
} as const;

/** Whole dollars, tabular. Pass perDay for a rental daily fee. `was` shows a struck-through earlier price. */
export function PriceTag({
  cents,
  perDay = false,
  was,
  size = "md",
  tone = "default",
  className,
}: {
  cents: number;
  perDay?: boolean;
  was?: number;
  size?: keyof typeof sizes;
  tone?: "default" | "ink";
  className?: string;
}) {
  const s = sizes[size];
  const ink = tone === "ink";
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 tabular-nums", className)}>
      {was !== undefined && (
        <span className={cn("text-xs line-through", ink ? "text-ink-muted" : "text-muted-foreground")}>
          {money(was)}
        </span>
      )}
      <span className={cn(s.amount, ink && "text-ink-foreground")}>{money(cents)}</span>
      {perDay && (
        <span className={cn("font-normal", s.unit, ink ? "text-ink-muted" : "text-muted-foreground")}>/day</span>
      )}
    </span>
  );
}
