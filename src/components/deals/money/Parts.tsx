import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label on the left, value on the right. Money lines pass tabular values. */
export function Row({
  label,
  hint,
  children,
  strong = false,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className={cn(strong ? "text-[15px] font-semibold" : "text-[15px] text-muted-foreground")}>{label}</p>
        {hint && <p className="mt-0.5 text-label text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("shrink-0 text-right tabular-nums", strong ? "text-heading" : "text-[15px] font-medium")}>
        {children}
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("animate-rise rounded-xl border border-border bg-card p-5", className)}>
      {children}
    </section>
  );
}

export function Hairline() {
  return <div className="h-px w-full bg-border" aria-hidden />;
}

export function PhoneSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
