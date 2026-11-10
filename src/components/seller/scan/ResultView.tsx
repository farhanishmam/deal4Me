"use client";

import { useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conditionLabel, money } from "@/lib/format";
import { rentalTerms } from "@/lib/real/onboarding-records";
import type { Condition, PriceSuggestion } from "@/lib/types";
import { centsToText, estimateFor, parsePrice, type Appraisal, type Photo, type ScanKind } from "./scan-utils";

const CONDITIONS = ["new", "like_new", "good", "used"];
type Choice = "rental" | "sale";

/** Photo and name, then Rent and Buy side by side for goods, or one menu price for food. */
export function ResultView({
  photo,
  appraisal,
  canList,
  listing,
  error,
  onList,
  onDiscard,
}: {
  photo: Photo;
  appraisal: Appraisal;
  canList: boolean;
  listing: boolean;
  error?: string;
  onList: (kind: ScanKind, amountCents: number) => void;
  onDiscard: () => void;
}) {
  const { item } = appraisal;
  const isFood = appraisal.kind === "food";
  const [choice, setChoice] = useState<Choice>("rental");
  const kind: ScanKind = isFood ? "food" : choice;
  const estimate = estimateFor(appraisal, kind);
  // Each choice keeps its own edited price, so switching cards never loses a change.
  const [texts, setTexts] = useState<Record<ScanKind, string | undefined>>({ rental: undefined, sale: undefined, food: undefined });
  const text = texts[kind] ?? centsToText(estimate.amountCents);
  const [open, setOpen] = useState(false);
  const cents = parsePrice(text);
  const condition = !isFood && CONDITIONS.includes(item.condition) ? conditionLabel(item.condition as Condition) : "";
  const deposit = kind === "rental" && cents ? rentalTerms(cents, estimate).depositCents : undefined;
  const [low, high] = estimate.rangeCents;
  const unit = kind === "rental" ? "/ day" : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative h-[150px] overflow-hidden rounded-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={item.name} className="size-full object-cover" />
          <button
            type="button"
            aria-label="Discard and scan again"
            onClick={onDiscard}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-ink/60 text-ink-foreground outline-none transition-colors duration-150 hover:bg-ink/80 focus-visible:ring-3 focus-visible:ring-primary/40"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="animate-rise mt-4">
          <h1 className="text-[20px] leading-tight font-bold tracking-[-0.018em]">{item.name.trim()}</h1>
          {condition && <p className="mt-1 text-[15px] text-muted-foreground">{condition}</p>}

          {!isFood && (
            <div role="radiogroup" aria-label="How to list it" className="mt-4 grid grid-cols-2 gap-3">
              {(["rental", "sale"] as const).map((k) => {
                const e = estimateFor(appraisal, k);
                const shown = parsePrice(texts[k] ?? "") ?? e.amountCents;
                const selected = choice === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setChoice(k)}
                    className={`flex min-h-[112px] flex-col items-start rounded-2xl bg-card p-4 text-left outline-none transition-shadow duration-150 focus-visible:ring-3 focus-visible:ring-primary/40 ${
                      selected ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-foreground/25"
                    }`}
                  >
                    <span className="text-[14px] font-semibold text-muted-foreground">{k === "rental" ? "Rent" : "Buy"}</span>
                    <span className="mt-1 text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums">
                      {money(shown)}
                      {k === "rental" && <span className="text-[15px] font-semibold text-muted-foreground"> / day</span>}
                    </span>
                    <span className="mt-auto pt-3 text-[13px] text-muted-foreground tabular-nums">
                      {money(e.rangeCents[0])} to {money(e.rangeCents[1])}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className={isFood ? "mt-5" : "mt-5 border-t border-border pt-4"}>
            {!isFood && <p className="text-[14px] text-muted-foreground">{kind === "rental" ? "Your daily price" : "Your selling price"}</p>}
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="text-[44px] leading-none font-bold tracking-[-0.03em]">$</span>
              <input
                aria-label={kind === "rental" ? "Price per day in dollars" : isFood ? "Menu price in dollars" : "Selling price in dollars"}
                inputMode="decimal"
                value={text}
                onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))}
                style={{ width: `${Math.max(2, text.length)}ch` }}
                className="min-w-0 border-b border-border bg-transparent text-[44px] leading-none font-bold tracking-[-0.03em] outline-none transition-colors duration-150 focus:border-primary"
              />
              {unit && <span className="text-[17px] font-semibold text-muted-foreground">{unit}</span>}
            </div>
            {!cents && <p className="mt-2 text-[14px] text-destructive">Enter a price above $0.</p>}
          </div>

          <dl className="mt-3 divide-y divide-border text-[15px]">
            {isFood && (
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted-foreground">Typical range</dt>
                <dd className="font-semibold tabular-nums">{money(low)} to {money(high)}</dd>
              </div>
            )}
            {deposit !== undefined && (
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted-foreground">Deposit</dt>
                <dd className="font-semibold tabular-nums">{money(deposit)} <span className="font-normal text-muted-foreground">held, not charged</span></dd>
              </div>
            )}
          </dl>

          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between rounded-lg text-[15px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
          >
            Why this price
            <ChevronDown className={`size-[18px] text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
          {open && <Reasoning estimate={estimate} />}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-3">
        {error && <p role="alert" className="mb-2 text-[14px] text-destructive">{error}</p>}
        {!canList && !error && <p className="mb-2 text-[14px] text-muted-foreground">Your store is still loading.</p>}
        <Button
          type="button"
          disabled={!cents || !canList || listing}
          onClick={() => cents && onList(kind, cents)}
          className="h-12 w-full rounded-xl text-[17px] font-semibold"
        >
          {listing ? (
            <>
              <Loader2 className="size-[18px] animate-spin motion-reduce:animate-none" />
              Listing
            </>
          ) : error ? (
            "Try again"
          ) : kind === "rental" ? (
            "List for rent"
          ) : kind === "sale" ? (
            "List for sale"
          ) : (
            "List it"
          )}
        </Button>
      </div>
    </div>
  );
}

function Reasoning({ estimate }: { estimate: PriceSuggestion }) {
  return (
    <p className="animate-rise pb-3 text-[15px] leading-relaxed text-muted-foreground">
      {estimate.reasoning}
    </p>
  );
}
