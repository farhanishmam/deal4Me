"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { money, perDay } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import type { Condition, Item, PriceSuggestion } from "@/lib/types";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "used", label: "Used" },
];

const toDollars = (cents: number | undefined) => (cents === undefined ? "" : String(cents / 100));
const toCents = (text: string): number | null => {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-label text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Money({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        inputMode="decimal"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="pl-6 tabular-nums"
      />
    </div>
  );
}

export function ItemSheet({
  item,
  open,
  onOpenChange,
}: {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rental = item.kind === "rental";
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [condition, setCondition] = useState<Condition | undefined>(item.condition);
  const [price, setPrice] = useState(toDollars(item.priceCents));
  const [daily, setDaily] = useState(toDollars(item.rental?.dailyFeeCents));
  const [deposit, setDeposit] = useState(toDollars(item.rental?.depositCents));
  const [minimum, setMinimum] = useState(toDollars(item.rental?.minDailyFeeCents));
  // Whether the private minimum was known when the sheet opened. A later refresh must not change that.
  const [minimumLoaded] = useState(() => item.rental?.minDailyFeeCents !== undefined);
  const [maxDays, setMaxDays] = useState(String(item.rental?.maxDays ?? 7));
  const [binding, setBinding] = useState(item.rental?.bindingCheckRequired ?? false);

  const [suggestion, setSuggestion] = useState<PriceSuggestion | undefined>(item.suggestion);
  const [asking, setAsking] = useState(!item.suggestion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ask the deals agent once per opened item. Background refreshes replace `item`
  // with a new object, which must not trigger another paid call.
  const opened = useRef(item);
  useEffect(() => {
    const first = opened.current;
    if (first.suggestion) return;
    let alive = true;
    api
      .suggestPrice(first)
      .then((s) => alive && setSuggestion(s))
      .catch(() => undefined)
      .finally(() => alive && setAsking(false));
    return () => {
      alive = false;
    };
  }, []);

  const useSuggestion = () => {
    if (!suggestion) return;
    if (rental) {
      setDaily(toDollars(suggestion.amountCents));
      if (suggestion.depositCents !== undefined) setDeposit(toDollars(suggestion.depositCents));
    } else {
      setPrice(toDollars(suggestion.amountCents));
    }
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("Add a name.");
    let next: Item = {
      ...item,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      condition: item.kind === "food" ? item.condition : condition,
    };
    if (rental) {
      const dailyFeeCents = toCents(daily);
      const depositCents = toCents(deposit);
      // Blank before the private minimum has loaded: leave it out and the server keeps the saved one.
      const minDailyFeeCents = !minimum.trim() && !minimumLoaded ? undefined : toCents(minimum);
      const days = Number.parseInt(maxDays, 10);
      if (dailyFeeCents === null || depositCents === null || minDailyFeeCents === null) return setError("Enter every amount.");
      if (!Number.isFinite(days) || days < 1) return setError("Max days must be at least 1.");
      if (minDailyFeeCents !== undefined && minDailyFeeCents > dailyFeeCents) return setError("The minimum can't be above the daily fee.");
      next = {
        ...next,
        suggestion,
        rental: { dailyFeeCents, minDailyFeeCents, depositCents, maxDays: days, bindingCheckRequired: binding },
      };
    } else {
      const priceCents = toCents(price);
      if (priceCents === null) return setError("Enter a price.");
      next = { ...next, priceCents, suggestion };
    }
    setSaving(true);
    try {
      await api.updateItem(next);
      toast.success("Saved");
      onOpenChange(false);
    } catch {
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  };

  const suggestionLine = suggestion
    ? rental
      ? `${perDay(suggestion.amountCents)}${suggestion.depositCents !== undefined ? `, ${money(suggestion.depositCents)} deposit` : ""}`
      : money(suggestion.amountCents)
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-14">
          <SheetTitle className="truncate text-heading">{item.name}</SheetTitle>
          <SheetDescription className="sr-only">Edit this item</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <div className="relative overflow-hidden rounded-xl bg-muted">
            <Image
              src={thumbFor(item)}
              alt={item.name}
              width={800}
              height={600}
              unoptimized
              className="aspect-[2/1] w-full object-cover"
            />
            {condition && <ConditionBadge condition={condition} className="absolute top-3 left-3" />}
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </Field>
              {item.kind !== "food" && (
                <Field label="Condition">
                  <select
                    value={condition ?? "good"}
                    onChange={(e) => setCondition(e.target.value as Condition)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors duration-150 focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/15"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-6">
            {rental ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Daily fee">
                    <Money label="Daily fee" value={daily} onChange={setDaily} />
                  </Field>
                  <Field label="Deposit" hint="Held, not charged">
                    <Money label="Deposit" value={deposit} onChange={setDeposit} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Private minimum"
                    hint={
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3" />
                        Never shown to visitors
                      </span>
                    }
                  >
                    <Money
                      label="Private minimum daily fee"
                      value={minimum}
                      onChange={setMinimum}
                      placeholder={minimumLoaded ? undefined : "Unchanged"}
                    />
                  </Field>
                  <Field label="Max days">
                    <Input
                      inputMode="numeric"
                      aria-label="Max days"
                      value={maxDays}
                      onChange={(e) => setMaxDays(e.target.value.replace(/\D/g, ""))}
                      className="tabular-nums"
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-4 py-1">
                  <Label htmlFor="binding" className="text-sm font-medium">
                    Binding check
                  </Label>
                  <Switch id="binding" checked={binding} onCheckedChange={setBinding} />
                </div>
              </>
            ) : (
              <Field label="Price">
                <Money label="Price" value={price} onChange={setPrice} />
              </Field>
            )}

            <div className="flex flex-col gap-2 rounded-xl bg-muted p-4">
              {asking ? (
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  Deals agent is pricing...
                </p>
              ) : suggestion ? (
                <>
                  <p className="flex items-center gap-1.5 text-label text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    Deals agent suggests
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-heading whitespace-nowrap tabular-nums">{suggestionLine}</span>
                    <Button variant="outline" size="sm" onClick={useSuggestion}>
                      Use suggestion
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestion right now.</p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 gap-2 border-t border-border px-5 py-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
