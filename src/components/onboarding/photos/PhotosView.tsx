"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { SuccessMoment } from "@/components/onboarding/SuccessMoment";
import { Timer } from "@/components/shared/Timer";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useHydrated, useStore } from "@/lib/store";
import { DEMO_PHOTO_SETS, demoPhotosFor } from "@/lib/demo-photos";
import { appraisePhotoForSale } from "@/lib/real/photos";
import type { SellerKind, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FlowBackdrop } from "./FlowBackdrop";
import { PhotoCell } from "./PhotoCell";
import { MAX_PHOTOS, emptySlot, finalItem, slotFromItem } from "./model";
import type { Mode, Slot } from "./model";

type Phase = "idle" | "running" | "ready" | "building" | "done" | "error";
type Source = File | string;

const patch = (slots: Slot[], i: number, next: Partial<Slot>) =>
  slots.map((s, idx) => (idx === i ? { ...s, ...next } : s));

export function PhotosView() {
  const params = useSearchParams();
  const [kind, setKind] = useState<SellerKind>(() => params.get("kind") === "business" ? "business" : "local");

  const hydrated = useHydrated();
  const startTimer = useStore((s) => s.startTimer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: MAX_PHOTOS }, emptySlot));
  const [total, setTotal] = useState(0);
  const [step, setStep] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [usingSamples, setUsingSamples] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  const last = useRef<{ list: Source[]; previews: string[]; kind: SellerKind } | null>(null);

  // The clock starts with the first screen, unless an earlier step already started it.
  useEffect(() => {
    if (!hydrated) return;
    const t = useStore.getState().timers.onboarding;
    if (!t || t.stoppedAt !== undefined) startTimer("onboarding");
  }, [hydrated, startTimer]);

  useEffect(() => () => {
    run.current += 1;
    last.current?.previews.forEach((src) => {
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    });
  }, []);

  const start = useCallback(
    async (list: Source[], previews: string[], sourceKind: SellerKind) => {
      const id = ++run.current;
      const live = () => run.current === id;
      last.current?.previews.forEach((src) => {
        if (src.startsWith("blob:") && !previews.includes(src)) URL.revokeObjectURL(src);
      });
      last.current = { list, previews, kind: sourceKind };
      setKind(sourceKind);
      setPhase("running");
      setNote("");
      setTotal(list.length);
      setStep("Reading your photos");
      setSlots(Array.from({ length: MAX_PHOTOS }, emptySlot));
      // Photos land one after another, so the grid feels alive from the first tap.
      previews.forEach((src, i) =>
        setTimeout(() => live() && setSlots((s) => patch(s, i, { src })), 40 + i * 55)
      );
      try {
        const result = await api.importFromPhotos(list, sourceKind, {
          onStep: (label) => live() && setStep(label),
          onItem: (item, i) => live() && setSlots((s) => patch(s, i, slotFromItem(item, previews[i]))),
        });
        if (!live()) return;
        setShop(result);
        setPhase("ready");
      } catch (error) {
        if (live()) {
          setNote(error instanceof Error ? error.message : "Could not import your photos. Try again.");
          setPhase("error");
        }
      }
    },
    []
  );

  const take = useCallback(
    (files: Source[], sourceKind: SellerKind = kind) => {
      const images = files.filter((f) => typeof f === "string" || ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type));
      if (images.length === 0) {
        setNote("Choose JPG, PNG, WebP, or GIF photos.");
        return;
      }
      const list = images.slice(0, MAX_PHOTOS);
      setUsingSamples(list.every((source) => typeof source === "string" && demoPhotosFor(sourceKind).some((sample) => sample.src === source)));
      void start(
        list,
        list.map((f) => (typeof f === "string" ? f : URL.createObjectURL(f))),
        sourceKind,
      );
      if (images.length > MAX_PHOTOS) setNote(`Using the first ${MAX_PHOTOS} photos.`);
      else if (images.length < files.length) setNote("Only JPG, PNG, WebP, and GIF photos were selected.");
    },
    [start, kind]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (phase === "idle") take(Array.from(e.dataTransfer.files));
  };

  const setMode = (i: number, mode: Mode) => {
    const slot = slots[i];
    if (!slot.item || slot.mode === mode) return;
    if (mode === "rent" || slot.saleSuggestion) {
      const s = slot.saleSuggestion;
      setSlots((all) => patch(all, i, { mode, sale: mode === "sell" && s && !slot.sale ? String(Math.round(s.amountCents / 100)) : slot.sale }));
      return;
    }
    const currentRun = run.current;
    setSlots((all) => patch(all, i, { mode, pricing: true, pricingError: undefined }));
    void appraisePhotoForSale(slot.item.photoUrl).then(
      (s) => {
        if (run.current === currentRun) setSlots((all) => patch(all, i, { saleSuggestion: s, sale: String(Math.round(s.amountCents / 100)), pricing: false }));
      },
      (error) => {
        if (run.current === currentRun) setSlots((all) => patch(all, i, { pricing: false, pricingError: error instanceof Error ? error.message : "Pricing unavailable. Enter your price." }));
      }
    );
  };

  const setPrice = (i: number, value: string) =>
    setSlots((all) => patch(all, i, all[i].mode === "rent" && kind === "local" ? { rent: value } : { sale: value, pricingError: undefined }));

  const build = async () => {
    if (!shop) return;
    const updated = slots.flatMap((slot) => {
      const item = finalItem(slot, kind);
      return item ? [item] : [];
    });
    if (updated.some((item) => (item.kind === "rental" ? item.rental?.dailyFeeCents ?? 0 : item.priceCents ?? 0) <= 0)) {
      setNote("Enter a price above $0 for each item.");
      return;
    }
    setPhase("building");
    setNote("");
    try {
      const changed = updated.filter((item, index) => item !== slots[index].item);
      await Promise.all(changed.map((item) => api.updateItem(item)));
      setPhase("done");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not save your changes. Try again.");
      setPhase("ready");
    }
  };

  const identified = slots.filter((s) => s.item).length;
  const pending = useMemo(() => slots.some((s) => s.pricing), [slots]);

  if (phase === "done" && shop) {
    return (
      <div className="flex flex-1 flex-col justify-center py-4">
        <SuccessMoment shop={shop} />
      </div>
    );
  }

  const idle = phase === "idle";
  const noun = kind === "local" ? "gear" : "dishes";
  const title = idle
    ? "Add your photos"
    : phase === "running"
      ? "Identifying"
      : phase === "error"
        ? "That did not work"
        : `${identified} ${identified === 1 ? "item" : "items"} ready`;
  const sub = idle
    ? `Up to ${MAX_PHOTOS} photos of your ${noun}`
    : phase === "running"
      ? `${step}...`
      : phase === "building"
        ? "Saving your changes..."
        : phase === "error"
          ? "Your photos are still here"
          : usingSamples ? "Sample prices, ready for your demo" : "Check the prices, then go live";
  const pinned = phase === "running" || phase === "ready" || phase === "building";

  const build_ = (
    <Button
      size="lg"
      onClick={build}
      disabled={phase !== "ready" || pending}
      className="h-12 w-full rounded-xl text-[16px] font-semibold sm:h-14 sm:w-auto sm:min-w-56 sm:px-8 sm:text-[17px]"
    >
      {phase === "building" && <Loader2 className="animate-spin" />}
      Build my storefront
    </Button>
  );

  const alert = note ? (
    <p role="alert" className="text-sm text-foreground">
      {note}
    </p>
  ) : null;

  return (
    <div
      onDragOver={(e) => {
        if (!idle) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative z-10 flex flex-1 flex-col",
        idle && "justify-center pb-6 sm:pb-16",
        pinned && "pb-32",
        dragging && "rounded-2xl ring-2 ring-foreground/30 ring-offset-8 ring-offset-background"
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {!idle && <FlowBackdrop />}
      {idle && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[320px] overflow-hidden lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-[46%]"
        >
          <Image
            src="/demo/scenes/wasatch-peak.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="origin-bottom scale-[1.2] object-cover saturate-[0.85]"
            style={{ objectPosition: "62% 50%" }}
          />
          <div className="absolute inset-0 bg-ink/30" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink via-ink/70 to-transparent lg:hidden" />
          <div className="absolute inset-y-0 left-0 hidden w-1/2 bg-linear-to-r from-ink to-transparent lg:block" />
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-ink/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 hidden h-40 bg-linear-to-t from-ink/85 to-transparent lg:block" />
        </div>
      )}

      <header className="relative">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 sm:gap-y-3">
          <p
            className="col-start-1 row-start-1 pt-1.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase sm:pt-0 sm:text-[13px]"
            aria-live="polite"
          >
            {sub}
          </p>
          <h1
            className={
              idle
                ? "col-span-2 row-start-2 text-[46px] leading-none font-bold tracking-[-0.04em] text-foreground sm:text-[72px] lg:col-span-1 lg:text-[88px] lg:leading-[0.98] lg:tracking-[-0.045em]"
                : "col-span-2 row-start-2 text-[38px] leading-none font-bold tracking-[-0.04em] text-foreground sm:col-span-1 sm:text-[72px] sm:leading-[0.98] sm:tracking-[-0.045em]"
            }
          >
            {title}
          </h1>
          <div className="col-start-2 row-start-1 flex flex-col items-end sm:row-span-2 sm:self-end">
            {idle ? (
              <Timer name="onboarding" size="sm" className="justify-end font-mono text-muted-foreground" />
            ) : (
              <Timer
                name="onboarding"
                showDot={false}
                className="justify-end text-[28px] leading-none font-bold tracking-[-0.04em] text-foreground sm:text-[72px] sm:leading-[0.98] sm:tracking-[-0.045em]"
              />
            )}
            <p className="mt-1 min-h-4 font-mono text-[11px] tracking-wide text-muted-foreground tabular-nums sm:text-[13px]">
              {idle ? "" : `${identified} of ${total}`}
            </p>
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total || 1}
          aria-valuenow={identified}
          className={cn("mt-5 h-0.5 overflow-hidden rounded-full bg-border transition-opacity duration-300 sm:mt-6", idle && "opacity-0")}
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
            style={{ width: `${total ? (identified / total) * 100 : 0}%` }}
          />
        </div>
      </header>

      {!pinned && alert && <div className="mt-4">{alert}</div>}

      {idle ? (
        <div className="relative mt-8 grid animate-rise gap-8 sm:mt-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-5 sm:gap-6">
            <div role="radiogroup" aria-label="Photo category" className="flex items-center gap-0.5 rounded-xl border border-border p-0.5">
              {(["local", "business"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={kind === option}
                  onClick={() => setKind(option)}
                  className={cn(
                    "h-10 min-w-20 rounded-[10px] px-5 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-foreground/30",
                    kind === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option === "local" ? "Gear" : "Food"}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-wrap items-center gap-4">
              <Button
                size="lg"
                onClick={() => input.current?.click()}
                className="group h-14 w-full rounded-xl px-8 text-[17px] font-semibold sm:w-auto"
              >
                Choose photos
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
              </Button>
              <span className="hidden text-sm text-muted-foreground sm:inline">Or drop them here.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_PHOTO_SETS.map((set) => (
              <button
                key={set.kind}
                type="button"
                onClick={() => take(set.photos.map((sample) => sample.src), set.kind)}
                className="group flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-ink/60 p-2.5 text-left outline-none backdrop-blur-md transition-colors duration-150 hover:bg-ink-raised/80 focus-visible:ring-3 focus-visible:ring-foreground/30"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={set.photos[0].src}
                    alt={set.photos[0].name}
                    className="size-full origin-top scale-110 object-cover object-top transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.15]"
                  />
                </div>
                <div className="px-1 pb-1">
                  <p className="flex items-center justify-between gap-2 text-[15px] font-semibold">
                    {set.label}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-foreground" />
                  </p>
                  <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase tabular-nums">
                    {set.photos.length} {set.photos.length === 1 ? "photo" : "photos"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={
            total <= 2
              ? "mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4"
              : "mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
          }
        >
          {slots.slice(0, total).map((slot, i) => (
            <PhotoCell
              key={i}
              slot={slot}
              kind={kind}
              failed={phase === "error"}
              onMode={(m) => setMode(i, m)}
              onPrice={(v) => setPrice(i, v)}
            />
          ))}
        </div>
      )}

      {phase === "error" && (
        <div className="mt-6 flex items-center gap-3">
          <Button size="lg" className="h-12 rounded-xl px-6 font-semibold" onClick={() => last.current && void start(last.current.list, last.current.previews, last.current.kind)}>
            Try again
          </Button>
          <Button size="lg" variant="ghost" className="h-12 rounded-xl px-5" onClick={() => input.current?.click()}>
            Choose other photos
          </Button>
        </div>
      )}

      {pinned && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-ink via-ink/95 to-transparent px-4 pt-10 pb-4 sm:px-0 sm:pb-6">
          <div className="mx-auto flex w-full max-w-[1454px] flex-col gap-3 sm:flex-row sm:px-8 sm:items-center sm:justify-end">
            {alert && <div className="sm:mr-auto">{alert}</div>}
            {build_}
          </div>
        </div>
      )}
    </div>
  );
}
