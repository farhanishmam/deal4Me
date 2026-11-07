import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { mark: number; text: string; gap: string }> = {
  sm: { mark: 22, text: "text-[14px]", gap: "gap-2" },
  md: { mark: 28, text: "text-[16px]", gap: "gap-2.5" },
  lg: { mark: 40, text: "text-[22px]", gap: "gap-3" },
};

/**
 * Peak mark plus wordmark. tone "ink" is for use on dark ink panels.
 * Pass markOnly to show the mark without the name.
 */
export function Logo({
  tone = "default",
  size = "md",
  markOnly = false,
  className,
}: {
  tone?: "default" | "ink";
  size?: LogoSize;
  markOnly?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  const ink = tone === "ink";
  return (
    <span
      className={cn("inline-flex items-center", s.gap, className)}
      aria-label={BRAND.name}
    >
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect
          width="32"
          height="32"
          rx="9"
          className={ink ? "fill-ink-foreground" : "fill-primary"}
        />
        {/* two peaks and a low saddle between them */}
        <path
          d="M5.5 23.5 12.8 9.8c.4-.7 1.4-.7 1.8 0l3.3 6.1 1.9-3.2c.4-.7 1.4-.7 1.8 0l5.4 10.8c.3.6-.1 1.2-.8 1.2H6.3c-.7 0-1.1-.5-.8-1.2Z"
          className={ink ? "fill-ink" : "fill-primary-foreground"}
        />
      </svg>
      {!markOnly && (
        <span
          className={cn(
            "leading-none tracking-[-0.015em] whitespace-nowrap",
            s.text,
            ink ? "text-ink-foreground" : "text-foreground"
          )}
        >
          <span className="font-semibold">{BRAND.wordmark.strong}</span>{" "}
          <span
            className={cn(
              "font-normal",
              ink ? "text-ink-muted" : "text-muted-foreground"
            )}
          >
            {BRAND.wordmark.light}
          </span>
        </span>
      )}
    </span>
  );
}
