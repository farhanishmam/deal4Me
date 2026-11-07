import { Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const BARS = [0.45, 0.8, 0.55, 1, 0.6, 0.85, 0.4];

/** Visual states only: idle, listening, processing. */
export function MicButton({
  state = "idle",
  size = "md",
  onClick,
  className,
}: {
  state?: "idle" | "listening" | "processing";
  size?: "md" | "lg";
  onClick?: () => void;
  className?: string;
}) {
  const listening = state === "listening";
  const processing = state === "processing";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Stop listening" : processing ? "Working" : "Speak"}
      aria-pressed={listening}
      disabled={processing}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full text-primary-foreground transition-colors duration-150 outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-95",
        size === "lg" ? "size-20" : "size-14",
        processing ? "bg-ink" : "bg-primary hover:bg-primary-hover",
        className
      )}
    >
      <style>{`@keyframes ms-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}`}</style>
      {listening && (
        <>
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
          <span aria-hidden className="absolute -inset-2 rounded-full bg-primary/10" />
        </>
      )}
      <span className="relative flex items-center justify-center">
        {listening ? (
          <span className={cn("flex items-center gap-[3px]", size === "lg" ? "h-8" : "h-6")} aria-hidden>
            {BARS.map((h, i) => (
              <span
                key={i}
                className="w-[3px] origin-center rounded-full bg-primary-foreground"
                style={{
                  height: `${h * 100}%`,
                  animation: `ms-wave ${0.9 + (i % 3) * 0.2}s ease-in-out ${i * 0.08}s infinite`,
                }}
              />
            ))}
          </span>
        ) : processing ? (
          <Loader2 className={cn("animate-spin", size === "lg" ? "size-8" : "size-6")} />
        ) : (
          <Mic className={size === "lg" ? "size-8" : "size-6"} />
        )}
      </span>
    </button>
  );
}
