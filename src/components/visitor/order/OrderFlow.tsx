"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Loader2, Minus, Plus, Store } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { clockTime, money } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import { useShop, useStore } from "@/lib/store";
import type { FoodOrder, Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useO } from "./copy";

type Cart = Record<string, number>;
type Pickup = "asap" | "15" | "30";

const cartKey = (shopId: string) => `ms2034-cart:${shopId}`;
const PICKUP_MINUTES: Record<Pickup, number> = { asap: 10, "15": 15, "30": 30 };

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readRaw(shopId: string): string {
  try {
    return window.localStorage.getItem(cartKey(shopId)) ?? "";
  } catch {
    return "";
  }
}

function parseCart(raw: string): Cart {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return {};
    const out: Cart = {};
    for (const [id, qty] of Object.entries(value as Record<string, unknown>)) {
      if (typeof qty === "number" && qty > 0) out[id] = Math.min(99, Math.floor(qty));
    }
    return out;
  } catch {
    return {};
  }
}

function Stepper({ name, value, onChange, disabled }: { name: string; value: number; onChange: (q: number) => void; disabled?: boolean }) {
  const c = useO();
  const round =
    "flex size-9 items-center justify-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15 [&_svg]:size-4";
  if (value === 0) {
    return (
      <button
        type="button"
        aria-label={`${c("add")} ${name}`}
        disabled={disabled}
        onClick={() => onChange(1)}
        className={cn(round, "size-11 border border-border bg-card hover:bg-muted [&_svg]:size-5")}
      >
        <Plus />
      </button>
    );
  }
  return (
    <div role="group" aria-label={name} className="flex h-11 items-center gap-1 rounded-full bg-card px-1 border border-border">
      <button type="button" aria-label={c("less")} disabled={disabled} onClick={() => onChange(value - 1)} className={cn(round, "hover:bg-muted")}>
        <Minus />
      </button>
      <span className="min-w-5 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={c("more")} disabled={disabled || value >= 99} onClick={() => onChange(Math.min(99, value + 1))} className={cn(round, "hover:bg-muted")}>
        <Plus />
      </button>
    </div>
  );
}

export function OrderFlow({ shopId }: { shopId: string }) {
  const c = useO();
  const shop = useShop(shopId);
  const items = useStore((s) => s.items);
  const logStep = useStore((s) => s.logStep);
  const stored = useSyncExternalStore(subscribe, () => readRaw(shopId), () => "");
  const [edited, setEdited] = useState<Cart | null>(null);
  const [pickup, setPickup] = useState<Pickup>("asap");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"idle" | "paying" | "error">("idle");
  const [placed, setPlaced] = useState<FoodOrder | null>(null);

  const menu = items.filter((i) => i.shopId === shopId && i.kind === "food" && i.available);

  if (!shop || menu.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader title={c("title")} backHref="/visit/home" />
        <EmptyState
          icon={<Store />}
          title={shop ? c("noMenu") : c("missingTitle")}
          description={c("missingBody")}
          action={
            <Link href="/visit/home" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {c("home")}
            </Link>
          }
          className="flex-1 animate-rise"
        />
      </div>
    );
  }

  const cart = edited ?? parseCart(stored);
  const lines = menu.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ itemId: i.id, qty: cart[i.id] }));
  const totalCents = lines.reduce((sum, l) => sum + (menu.find((m) => m.id === l.itemId)?.priceCents ?? 0) * l.qty, 0);
  const busy = phase === "paying";

  const groups = new Map<string, Item[]>();
  for (const item of menu) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);

  function setQty(id: string, qty: number) {
    setEdited({ ...cart, [id]: qty });
    if (phase === "error") setPhase("idle");
  }

  async function pay() {
    if (!shop || lines.length === 0 || busy) return;
    setPhase("paying");
    try {
      const at = new Date();
      at.setMinutes(at.getMinutes() + PICKUP_MINUTES[pickup]);
      const order = await api.placeFoodOrder(shop.id, lines, at.toISOString());
      try {
        window.localStorage.removeItem(cartKey(shop.id));
      } catch {
        /* storage can be blocked */
      }
      if (note.trim()) {
        logStep({ actor: "Storefront agent", action: "Note attached", detail: note.trim() });
      }
      setPlaced(order);
      setPhase("idle");
    } catch {
      setPhase("error");
    }
  }

  if (placed) {
    return (
      <div className="flex min-h-full flex-col bg-card px-4 pt-14 pb-4">
        <div className="flex animate-rise flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-7" strokeWidth={2.5} />
          </span>
          <h1 className="text-title">{c("placed")}</h1>
        </div>

        <section
          className="mt-10 flex animate-rise flex-col items-center gap-3 rounded-2xl bg-muted/60 px-5 py-9 text-center [animation-delay:80ms]"
          aria-label={c("code")}
        >
          <p className="font-mono text-[64px] leading-none font-bold tracking-widest" data-testid="pickup-code">
            {placed.pickupCode}
          </p>
          <p className="text-sm text-muted-foreground">{c("code")}</p>
        </section>

        <div className="mt-8 animate-rise text-center [animation-delay:120ms]">
          <p className="text-[17px] font-semibold">{shop.name}</p>
          <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">
            {c("ready", { time: clockTime(placed.pickupTime) })} · {money(placed.totalCents)}
          </p>
        </div>

        <div className="mt-auto flex animate-rise flex-col gap-1 pt-8 [animation-delay:160ms]">
          <Link href="/visit/trips" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}>
            {c("trips")}
          </Link>
          <Link href="/visit/home" className="flex h-11 items-center justify-center text-[15px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
            {c("home")}
          </Link>
        </div>
      </div>
    );
  }

  const chips: { id: Pickup; label: string }[] = [
    { id: "asap", label: c("asap") },
    { id: "15", label: c("plus15") },
    { id: "30", label: c("plus30") },
  ];

  return (
    <div className="flex min-h-full flex-col bg-card">
      <div className="flex flex-1 flex-col gap-5 pb-5">
        <ScreenHeader title={shop.name} backHref="/visit/agent" />

        {[...groups.entries()].map(([category, list], gi) => (
          <section
            key={category}
            className="flex animate-rise flex-col gap-2 px-4"
            style={{ animationDelay: `${40 + gi * 40}ms` }}
          >
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">{category}</h2>
            <ul className="flex flex-col gap-2">
              {list.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pr-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbFor(item)} alt="" draggable={false} className="size-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{item.name}</p>
                    <p className="text-[15px] text-muted-foreground tabular-nums">{money(item.priceCents ?? 0)}</p>
                  </div>
                  <Stepper name={item.name} value={cart[item.id] ?? 0} onChange={(q) => setQty(item.id, q)} disabled={busy} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="flex flex-col gap-2 px-4">
          <h2 id="pickup-label" className="text-[17px] font-bold tracking-[-0.01em]">
            {c("pickup")}
          </h2>
          <div role="radiogroup" aria-labelledby="pickup-label" className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
            {chips.map((chip) => {
              const on = pickup === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => setPickup(chip.id)}
                  className={cn(
                    "h-11 rounded-lg text-[15px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
                    on ? "bg-info-soft text-info" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="px-4">
          <input
            id="order-note"
            aria-label={c("notePh")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={c("notePh")}
            maxLength={120}
            disabled={busy}
            autoComplete="off"
            className="h-12 w-full rounded-xl bg-muted/60 px-4 text-[15px] outline-none transition-colors duration-150 placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-1.5 border-t border-border bg-card px-4 pt-3 pb-2">
        {phase === "error" && (
          <p role="alert" className="text-center text-sm text-destructive">
            {c("error")}
          </p>
        )}
        <Button className="h-12 w-full rounded-xl text-[17px] font-semibold tabular-nums" disabled={lines.length === 0 || busy} onClick={pay}>
          {busy && <Loader2 className="animate-spin" />}
          {busy
            ? c("sending", { shop: shop.name })
            : lines.length === 0
              ? c("empty")
              : c("pay", { total: money(totalCents) })}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">{c("card")}</p>
      </div>
    </div>
  );
}
