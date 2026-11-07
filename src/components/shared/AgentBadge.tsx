import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks something an AI agent did or said. */
export function AgentBadge({
  label = "Agent",
  tone = "ink",
  className,
}: {
  label?: string;
  tone?: "ink" | "soft";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tone === "ink" ? "bg-ink text-ink-foreground" : "bg-muted text-foreground",
        className
      )}
    >
      <Sparkles className="size-3" strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
}
