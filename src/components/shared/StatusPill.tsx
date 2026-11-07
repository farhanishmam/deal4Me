import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillTone = "neutral" | "info" | "warning" | "success" | "danger";

const tones: Record<PillTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-muted text-foreground", dot: "bg-muted-foreground" },
  info: { pill: "bg-info-soft text-info", dot: "bg-info" },
  warning: { pill: "bg-warning-soft text-warning-text", dot: "bg-warning" },
  success: { pill: "bg-success-soft text-success", dot: "bg-success" },
  danger: { pill: "bg-destructive-soft text-destructive", dot: "bg-destructive" },
};

export function StatusPill({
  tone = "neutral",
  dot = false,
  icon,
  children,
  className,
}: {
  tone?: PillTone;
  /** Show a small leading dot. */
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5",
        t.pill,
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}
