"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { isItemPhoto } from "@/lib/gear-photos";
import { itemPhotoDataUrl } from "@/lib/real/photos";
import { orderSamples } from "@/lib/sample-photos";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";

const quiet =
  "h-9 border-transparent bg-transparent px-2 hover:border-border focus-visible:bg-background/60";

/** An item card whose name, price and picture edit in place. Name and price save on blur. */
export function EditableItemCard({ item }: { item: Item }) {
  const amountCents = item.kind === "rental" ? item.rental?.dailyFeeCents ?? 0 : item.priceCents ?? 0;
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(amountCents / 100));
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const thumb = useRef<HTMLButtonElement>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const allItems = useStore((s) => s.items);
  // No two listings share a picture, so hide samples another item already uses.
  const samples = useMemo(() => {
    const taken = new Set(allItems.filter((other) => other.id !== item.id).map((other) => other.photoUrl));
    return orderSamples(item).filter((sample) => !taken.has(sample.url));
  }, [allItems, item]);

  const hasPhoto = isItemPhoto(item.photoUrl);

  /** Saves run one at a time, each built from the newest stored item, so a photo and a name or price edit never overwrite each other. */
  function save(build: (current: Item) => Item | null): Promise<void> {
    const run = queue.current.then(async () => {
      const current = useStore.getState().items.find((i) => i.id === item.id) ?? item;
      const next = build(current);
      if (next) await api.updateItem(next);
    });
    queue.current = run.catch(() => undefined);
    return run;
  }

  async function commit() {
    const cents = Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);
    const nextName = name.trim();
    if (!nextName || !Number.isFinite(cents) || cents <= 0) {
      setName(item.name);
      setPrice(String(amountCents / 100));
      return;
    }
    if (nextName === item.name && cents === amountCents) return;
    try {
      await save((current) =>
        current.kind === "rental" && current.rental
          ? {
              ...current,
              name: nextName,
              // Left out when this screen has not loaded the private minimum: the server keeps the saved one, capped at the new fee.
              rental: { ...current.rental, dailyFeeCents: cents, minDailyFeeCents: current.rental.minDailyFeeCents === undefined ? undefined : Math.min(current.rental.minDailyFeeCents, cents) },
            }
          : { ...current, name: nextName, priceCents: cents },
      );
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 1600);
    } catch {
      setName(item.name);
      setPrice(String(amountCents / 100));
    }
  }

  /** Sets the picture, or clears it with "". The old picture stays if the save fails. */
  async function setPhoto(photoUrl: string | (() => Promise<string>)) {
    if (busy) return;
    setBusy(true);
    setPhotoError("");
    try {
      const url = typeof photoUrl === "string" ? photoUrl : await photoUrl();
      await save((current) => (current.photoUrl === url ? null : { ...current, photoUrl: url }));
      setOpen(false);
      thumb.current?.focus();
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not save that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setPhotoError("");
    thumb.current?.focus();
  }

  return (
    <li className="flex animate-rise flex-col gap-3 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          ref={thumb}
          type="button"
          aria-label={`${hasPhoto ? "Change the photo of" : "Add a photo of"} ${item.name}`}
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
          className={`relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15 ${hasPhoto ? "bg-muted ring-1 ring-border" : "flex-col gap-1 border border-dashed border-muted-foreground/50 bg-muted/60 text-foreground hover:bg-muted"}`}
        >
          {hasPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.photoUrl} alt="" className="size-full object-cover" />
              <span aria-hidden className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-card/90 text-foreground ring-1 ring-border">
                <Pencil className="size-3" />
              </span>
            </>
          ) : (
            <>
              <ImagePlus aria-hidden className="size-5" />
              <span className="text-[11px] leading-none font-medium">Add photo</span>
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commit()}
            className={`${quiet} -ml-2 font-semibold`}
          />
          <p className="truncate pl-0 text-xs text-muted-foreground">{item.category}</p>
        </div>
        <div className="flex items-center gap-1">
          <span aria-live="polite" className="w-4">
            {saved && <Check className="size-4 text-success" aria-label="Saved" />}
          </span>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              aria-label={item.kind === "rental" ? "Daily price in dollars" : "Price in dollars"}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => void commit()}
              className={`${quiet} w-16 pl-5 font-semibold tabular-nums`}
            />
          </div>
          {item.kind === "rental" && <span className="text-xs text-muted-foreground">/day</span>}
        </div>
      </div>

      {open && (
        <div
          role="group"
          aria-label={`Photo of ${item.name}`}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="flex animate-rise flex-col gap-3 border-t border-border pt-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()} className="h-11 rounded-lg px-4">
              <Upload aria-hidden className="size-4" />
              {busy ? "Saving photo" : "Upload a photo"}
            </Button>
            <button
              type="button"
              aria-label="Close photo options"
              onClick={close}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void setPhoto(() => itemPhotoDataUrl(file));
            }}
          />

          {samples.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-label text-muted-foreground">Or pick a sample</p>
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={item.photoUrl === sample.url}
                    onClick={() => void setPhoto(sample.url)}
                    className={`flex w-24 shrink-0 snap-start flex-col gap-1 rounded-lg p-1 text-left outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50 ${item.photoUrl === sample.url ? "bg-primary-soft ring-1 ring-primary" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sample.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-md bg-muted object-cover" />
                    <span className="truncate text-xs font-medium">{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {photoError && (
            <p role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning-text">
              {photoError}
            </p>
          )}

          {hasPhoto && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setPhoto("")}
              className="flex h-11 items-center gap-2 self-start rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-destructive focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50"
            >
              <Trash2 aria-hidden className="size-4" />
              Remove photo
            </button>
          )}
        </div>
      )}
    </li>
  );
}
