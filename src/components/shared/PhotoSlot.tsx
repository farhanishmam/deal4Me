import { Check, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Square photo tile. empty: invites a photo. identifying: image with a working overlay.
 * identified: image with the item name underneath.
 */
export function PhotoSlot({
  state,
  src,
  label,
  onClick,
  onRemove,
  className,
}: {
  state: "empty" | "identifying" | "identified";
  src?: string;
  label?: string;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  if (state === "empty") {
    const cls = cn(
      "flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-input bg-card text-muted-foreground transition-colors duration-150",
      onClick && "hover:border-primary/40 hover:bg-primary-soft hover:text-primary focus-visible:ring-3 focus-visible:ring-primary/15 outline-none",
      className
    );
    return onClick ? (
      <button type="button" onClick={onClick} className={cls} aria-label="Add photo">
        <Plus className="size-5" />
      </button>
    ) : (
      <div className={cls}>
        <Plus className="size-5" />
      </div>
    );
  }

  const busy = state === "identifying";
  return (
    <div
      className={cn(
        "group relative aspect-square w-full animate-pop overflow-hidden rounded-xl border border-border bg-muted",
        className
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label ?? "Photo"}
          className={cn("size-full object-cover transition-[filter,opacity] duration-300", busy && "opacity-60 saturate-50")}
          draggable={false}
        />
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/30">
          <span className="flex size-10 items-center justify-center rounded-full bg-card shadow-lift">
            <Loader2 className="size-5 animate-spin text-primary" />
          </span>
        </div>
      )}
      {!busy && label && (
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold shadow-lift">
          <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} />
          <span className="truncate">{label}</span>
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove photo"
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-card text-foreground opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
