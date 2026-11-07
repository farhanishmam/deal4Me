import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  delta,
  className,
  style,
}: {
  label: string;
  value: string;
  /** Small positive change, shown in the success color. */
  delta?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "animate-rise rounded-xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="mt-2 text-metric tabular-nums">{value}</p>
      <p className="mt-1 h-5 text-label font-semibold text-success tabular-nums">
        {delta}
      </p>
    </div>
  );
}
