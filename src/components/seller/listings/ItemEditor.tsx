"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { fromZonedInput, money, toZonedInput } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import type { Condition, Item, PriceSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "used", label: "Used" },
];

function toDollars(cents: number | undefined): string {
  if (cents === undefined || !Number.isFinite(cents)) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function toCents(text: string): number | null {
  const clean = text.replace(/[$,\s]/g, "");
  if (!clean || !/^\d*\.?\d{0,2}$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && (
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Lock className="size-3" strokeWidth={2} />
          {hint}
        </span>
      )}
    </label>
  );
}

function Dollars({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-muted-foreground">$</span>
      <Input
        inputMode="decimal"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border-transparent bg-muted/60 pl-7 text-[15px]"
      />
    </div>
  );
}

const PRICE_STEPS = [
  "Looking at the item",
  "Checking comparable listings",
  "Weighing condition and demand",
  "Working out a fair price",
];

/** One estimate: label, price, short reasoning, and an optional action. */
function EstimateRow({ label, price, reasoning, action }: { label: string; price: string; reasoning: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center gap-3">
        <span className="w-12 shrink-0 text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">{price}</span>
        {action}
      </div>
      {reasoning && <p className="pl-[60px] text-[13px] leading-snug text-muted-foreground">{reasoning}</p>}
    </div>
  );
}

function UseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="rounded-lg">
      Use this price
    </Button>
  );
}

const plainInput = "h-11 rounded-xl border-transparent bg-muted/60 px-3 text-[15px]";

// Availability inputs hold Salt Lake wall-clock times, the zone the app shows dates in.
const localDateTime = toZonedInput;
const fromLocal = (value: string) => new Date(Date.parse(fromZonedInput(value) ?? ""));

/** Edits one item inside the phone. Cancel goes back with nothing saved. */
export function ItemEditor({ item, onClose }: { item: Item; onClose: () => void }) {
  const rental = item.kind === "rental" ? item.rental : undefined;
  const isRental = item.kind === "rental";

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [condition, setCondition] = useState<Condition | undefined>(item.condition);
  const [price, setPrice] = useState(toDollars(item.priceCents));
  const [daily, setDaily] = useState(toDollars(rental?.dailyFeeCents));
  const [deposit, setDeposit] = useState(toDollars(rental?.depositCents));
  const [minimum, setMinimum] = useState(toDollars(rental?.minDailyFeeCents));
  // Whether the private minimum was known when the editor opened. A later refresh must not change that.
  const [minimumLoaded] = useState(() => rental?.minDailyFeeCents !== undefined);
  const [maxDays, setMaxDays] = useState(rental ? String(rental.maxDays) : "");
  const [available, setAvailable] = useState(item.available);
  const [availableFrom, setAvailableFrom] = useState(localDateTime(item.availableFrom));
  const [availableUntil, setAvailableUntil] = useState(localDateTime(item.availableUntil));
  const [sizes, setSizes] = useState(item.sizes?.join(", ") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [fair, setFair] = useState<PriceSuggestion | undefined>(item.suggestion);
  const [asking, setAsking] = useState(false);
  const [step, setStep] = useState(0);
  const [fairError, setFairError] = useState("");
  const [applied, setApplied] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!asking) return;
    const id = window.setInterval(() => setStep((n) => Math.min(n + 1, PRICE_STEPS.length - 1)), 2200);
    return () => window.clearInterval(id);
  }, [asking]);

  const getFairPrice = async () => {
    if (!name.trim()) return setFairError("Give the item a name first.");
    setFairError("");
    setApplied(false);
    setStep(0);
    setAsking(true);
    try {
      const out = await api.suggestPrice({
        ...item,
        name: name.trim(),
        category: category.trim(),
        condition: item.kind === "food" ? item.condition : condition,
      });
      if (alive.current) setFair(out);
    } catch (e) {
      if (alive.current) setFairError(e instanceof Error && e.message ? e.message : "Could not get a price right now.");
    } finally {
      if (alive.current) setAsking(false);
    }
  };

  // The estimate that matches this item's kind: the one "Use this price" applies.
  const mine: PriceSuggestion | undefined = fair
    ? item.kind === "rental"
      ? fair.estimates?.rental ?? fair
      : item.kind === "sale"
        ? fair.estimates?.sale ?? fair
        : fair
    : undefined;

  const usePrice = () => {
    if (!mine) return;
    if (isRental) {
      setDaily(toDollars(mine.amountCents));
      if (mine.depositCents !== undefined) setDeposit(toDollars(mine.depositCents));
    } else {
      setPrice(toDollars(mine.amountCents));
    }
    setApplied(true);
  };

  const save = async () => {
    setError("");
    if (!name.trim()) return setError("Give the item a name.");
    const from = availableFrom ? fromLocal(availableFrom) : undefined;
    const until = availableUntil ? fromLocal(availableUntil) : undefined;
    if ((from && !Number.isFinite(from.getTime())) || (until && !Number.isFinite(until.getTime()))) {
      return setError("Choose valid availability dates.");
    }
    if (from && until && until <= from) return setError("Available until must be after available from.");
    const nextSizes = [...new Set(sizes.split(/[,\n]/).map((size) => size.trim()).filter(Boolean))];
    if (nextSizes.length > 30 || nextSizes.some((size) => size.length > 80)) {
      return setError("Enter up to 30 sizes, each under 80 characters.");
    }
    let next: Item = {
      ...item,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      condition: item.kind === "food" ? item.condition : condition,
      available,
      availableFrom: from?.toISOString(),
      availableUntil: until?.toISOString(),
      sizes: nextSizes.length ? nextSizes : undefined,
    };
    if (isRental) {
      const dailyFeeCents = toCents(daily);
      const depositCents = toCents(deposit);
      // Blank before the private minimum has loaded: leave it out and the server keeps the saved one.
      const minDailyFeeCents = !minimum.trim() && !minimumLoaded ? undefined : toCents(minimum);
      const days = Number.parseInt(maxDays, 10);
      if (dailyFeeCents === null || depositCents === null || minDailyFeeCents === null) return setError("Enter every amount.");
      if (!Number.isFinite(days) || days < 1) return setError("Max days must be at least 1.");
      if (minDailyFeeCents !== undefined && minDailyFeeCents > dailyFeeCents) return setError("The private minimum can't be above the daily fee.");
      next = {
        ...next,
        rental: {
          dailyFeeCents,
          depositCents,
          minDailyFeeCents,
          maxDays: days,
          bindingCheckRequired: rental?.bindingCheckRequired ?? false,
        },
      };
    } else {
      const priceCents = toCents(price);
      if (priceCents === null) return setError("Enter a price.");
      next = { ...next, priceCents };
    }
    setSaving(true);
    try {
      await api.updateItem(next);
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not save this item.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-card">
      <header className="flex h-12 shrink-0 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="-ml-2 flex size-10 items-center justify-center rounded-full outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.018em]">Edit item</h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-4 pt-2 pb-6">
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={thumbFor(item)}
            alt={item.name}
            width={800}
            height={360}
            unoptimized
            className="size-full object-cover"
          />
        </div>

        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className={plainInput} />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 rounded-xl border-transparent bg-muted/60 px-3 text-[15px]"
          />
        </Field>

        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} className={plainInput} />
        </Field>

        {item.kind !== "food" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted-foreground">Condition</span>
            <div role="radiogroup" aria-label="Condition" className="grid grid-cols-4 gap-1.5">
              {CONDITIONS.map((c) => {
                const on = condition === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setCondition(c.value)}
                    className={cn(
                      "h-10 rounded-xl text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15",
                      on ? "bg-primary-soft text-primary" : "bg-muted/60 text-foreground hover:bg-muted"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isRental ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily fee">
                <Dollars value={daily} onChange={setDaily} label="Daily fee" />
              </Field>
              <Field label="Deposit">
                <Dollars value={deposit} onChange={setDeposit} label="Deposit" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Private minimum" hint="Never shown to buyers">
                <Dollars
                  value={minimum}
                  onChange={setMinimum}
                  label="Private minimum"
                  placeholder={minimumLoaded ? undefined : "Unchanged"}
                />
              </Field>
              <Field label="Max days">
                <Input
                  inputMode="numeric"
                  value={maxDays}
                  onChange={(e) => setMaxDays(e.target.value.replace(/\D/g, ""))}
                  className={plainInput}
                />
              </Field>
            </div>
          </div>
        ) : (
          <Field label="Price">
            <Dollars value={price} onChange={setPrice} label="Price" />
          </Field>
        )}

        <div className="flex flex-col rounded-xl bg-muted/60 px-4 py-1">
          {asking ? (
            <p role="status" aria-live="polite" className="py-3 text-[15px] text-muted-foreground">
              {PRICE_STEPS[step]}...
            </p>
          ) : (
            <button
              type="button"
              onClick={getFairPrice}
              className="-mx-1 flex h-11 items-center gap-2 rounded-lg px-1 text-left text-[15px] font-medium text-info outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15"
            >
              <Sparkles className="size-4" strokeWidth={2} />
              {fair ? "Get a fair price again" : "Get a fair price"}
            </button>
          )}
          {fairError && !asking && (
            <p role="alert" className="pb-3 text-[13px] text-destructive">
              {fairError}
            </p>
          )}
          {fair && !asking && (
            <div className="divide-y divide-border border-t border-border">
              {item.kind === "food" || !fair.estimates ? (
                <EstimateRow
                  label={item.kind === "food" ? "Menu" : isRental ? "Rent" : "Buy"}
                  price={isRental ? `${money(fair.amountCents)} / day` : money(fair.amountCents)}
                  reasoning={fair.reasoning}
                  action={<UseButton onClick={usePrice} />}
                />
              ) : (
                <>
                  <EstimateRow
                    label="Rent"
                    price={`${money(fair.estimates.rental.amountCents)} / day`}
                    reasoning={fair.estimates.rental.reasoning}
                    action={isRental ? <UseButton onClick={usePrice} /> : undefined}
                  />
                  <EstimateRow
                    label="Buy"
                    price={money(fair.estimates.sale.amountCents)}
                    reasoning={fair.estimates.sale.reasoning}
                    action={item.kind === "sale" ? <UseButton onClick={usePrice} /> : undefined}
                  />
                </>
              )}
            </div>
          )}
          {applied && !asking && <p className="pb-3 text-[13px] text-muted-foreground">Filled in above. Save to keep it.</p>}
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Available</p>
            <p className="text-[13px] text-muted-foreground">{available ? "Open for buyer requests" : "Not accepting requests"}</p>
          </div>
          <Switch checked={available} onCheckedChange={setAvailable} aria-label="Available" />
        </div>

        {item.kind !== "food" && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <Field label="Available from">
              <Input
                type="datetime-local"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
                onInput={(event) => setAvailableFrom(event.currentTarget.value)}
                className={plainInput}
              />
            </Field>
            <Field label="Available until">
              <Input
                type="datetime-local"
                value={availableUntil}
                min={availableFrom || undefined}
                onChange={(event) => setAvailableUntil(event.target.value)}
                onInput={(event) => setAvailableUntil(event.currentTarget.value)}
                className={plainInput}
              />
            </Field>
            <Field label="Sizes offered">
              <Input
                value={sizes}
                onChange={(event) => setSizes(event.target.value)}
                placeholder="S, M, L or 160 cm, 170 cm"
                className={plainInput}
              />
            </Field>
            <p className="text-[13px] text-muted-foreground">Dates use your local time. Separate sizes with commas.</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-border bg-card px-4 pt-3 pb-3">
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-12 w-full rounded-xl text-[17px] font-semibold"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
