import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Left is the agent or the other side, right is the person using the screen.
 * Children can be rich content (cards, price rows). Set `typing` for the three-dot state.
 */
export function ChatBubble({
  side = "left",
  name,
  time,
  typing = false,
  children,
  className,
}: {
  side?: "left" | "right";
  name?: ReactNode;
  time?: string;
  typing?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const right = side === "right";
  return (
    <div
      className={cn(
        "flex animate-rise flex-col gap-1",
        right ? "items-end" : "items-start",
        className
      )}
    >
      {(name || time) && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          {name && <span className="font-semibold text-foreground/80">{name}</span>}
          {time && <span className="tabular-nums">{time}</span>}
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] text-[15px] leading-snug",
          typing ? "rounded-2xl px-4 py-3.5" : "rounded-2xl px-4 py-2.5",
          right
            ? "rounded-br-md bg-info-soft text-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        {typing ? (
          <span className="flex items-center gap-1" role="status" aria-label="Typing">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
