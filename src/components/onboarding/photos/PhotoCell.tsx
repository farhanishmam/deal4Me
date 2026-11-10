"use client";

import { Loader2, Plus } from "lucide-react";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import type { SellerKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Mode, Slot } from "./model";

const photoSize = "size-[104px] shrink-0 sm:size-32";
const cardBox = "flex flex-col gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur-md p-3 sm:p-4";

/** Square photo on ink. While identifying it dims under a quiet white spinner. */
function Tile({ src, busy = false, className }: { src: string; busy?: boolean; className?: string }) {
  return (
    <div className={cn("relative animate-pop overflow-hidden rounded-xl border border-border bg-muted", photoSize, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Photo"
        draggable={false}
        className={cn(
          "size-full object-cover transition-[filter,opacity] duration-300",
          /rent-gear|find-food/.test(src) && "origin-top scale-[1.4]",
          busy && "opacity-50 saturate-50"
        )}
      />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <Loader2 className="size-6 animate-spin text-foreground" />
        </div>
      )}
    </div>
  );
}

function PriceField({
  value,
  onChange,
  unit,
  label,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  label: string;
  busy?: boolean;
}) {
  return (
    <label className="flex h-12 items-center gap-1.5 rounded-xl border border-input bg-background px-3.5 transition-colors duration-150 focus-within:border-foreground/50 focus-within:ring-3 focus-within:ring-foreground/15">
      <span className="text-[17px] text-muted-foreground">$</span>
      {busy ? (
        <span className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Pricing...
        </span>
      ) : (
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-[22px] leading-none font-bold tracking-[-0.03em] text-foreground tabular-nums outline-none"
        />
      )}
      {unit && !busy && <span className="shrink-0 font-mono text-xs text-muted-foreground uppercase">{unit}</span>}
    </label>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const options: { id: Mode; label: string }[] = [
    { id: "rent", label: "Rent it" },
    { id: "sell", label: "Sell it" },
  ];
  return (
    <div role="radiogroup" aria-label="Rent or sell" className="grid grid-cols-2 gap-0.5 rounded-xl border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={mode === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-10 rounded-[10px] text-[13px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-foreground/30 sm:h-9",
            mode === o.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function WhyPrice({ slot }: { slot: Slot }) {
  const selling = slot.mode === "sell";
  const s = selling ? slot.saleSuggestion : slot.item?.suggestion;
  if (!s) return null;
  return (
    <Popover>
      <PopoverTrigger className="mt-2 rounded text-left text-xs text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-foreground/30">
        Why this price?
      </PopoverTrigger>
      {/* Popovers portal outside the ink theme, so the class is repeated here. */}
      <PopoverContent align="start" className="theme-ink w-64">
        <p className="text-sm">{s.reasoning}</p>
        <div className="flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">Typical range</span>
          <span className="text-sm font-semibold tabular-nums">
            {money(s.rangeCents[0])} to {money(s.rangeCents[1])}
            {!selling && slot.item?.kind === "rental" ? <span className="font-normal text-muted-foreground"> /day</span> : null}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PhotoCell({
  slot,
  kind,
  onPick,
  onMode,
  onPrice,
  failed = false,
}: {
  slot: Slot;
  kind: SellerKind;
  onPick?: () => void;
  onMode: (m: Mode) => void;
  onPrice: (v: string) => void;
  failed?: boolean;
}) {
  const { item, src } = slot;

  if (!src) {
    const empty = "flex h-[236px] items-center justify-center rounded-2xl border border-dashed border-input text-muted-foreground transition-colors duration-150 sm:h-[262px]";
    return onPick ? (
      <button type="button" onClick={onPick} aria-label="Add photo" className={cn(empty, "outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-foreground/30")}>
        <Plus className="size-5" />
      </button>
    ) : (
      <div className={empty}>
        <Plus className="size-5" />
      </div>
    );
  }

  if (!item) {
    if (failed) {
      return (
        <div className={cn(cardBox, "flex-row items-center gap-4")}>
          <Tile src={src} />
          <p className="text-sm text-muted-foreground">Not imported yet</p>
        </div>
      );
    }
    return (
      <div className={cardBox}>
        <div className="flex gap-3 sm:gap-4">
          <Tile src={src} busy />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <p className="mt-auto font-mono text-[11px] tracking-wide text-muted-foreground uppercase">Identifying...</p>
          </div>
        </div>
        {kind === "local" && <Skeleton className="h-10 w-full rounded-xl sm:h-9" />}
      </div>
    );
  }

  const local = kind === "local";
  const renting = local && slot.mode === "rent";
  const label = renting ? `Daily fee for ${item.name}` : `Price for ${item.name}`;

  return (
    <div className={cn(cardBox, "animate-rise transition-colors duration-150 focus-within:border-foreground/30")}>
      <div className="flex flex-1 gap-3 sm:gap-4">
        <Tile src={src} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{item.name}</p>
            {item.condition && <ConditionBadge condition={item.condition} />}
          </div>
          <div>
            <PriceField
              value={renting ? slot.rent : slot.sale}
              onChange={onPrice}
              unit={renting ? "/day" : undefined}
              label={label}
              busy={slot.pricing}
            />
            {slot.pricingError && slot.mode === "sell" ? <p role="status" className="mt-2 text-xs text-muted-foreground">{slot.pricingError} Enter a price above.</p> : <WhyPrice slot={slot} />}
          </div>
        </div>
      </div>
      {local && (
        <div className="flex flex-col gap-1.5">
          <ModeSwitch mode={slot.mode} onChange={onMode} />
          <p className="min-h-4 text-xs text-muted-foreground tabular-nums">
            {renting && item.rental ? `Deposit ${money(item.rental.depositCents)}, held, not charged` : "No deposit"}
          </p>
        </div>
      )}
    </div>
  );
}
