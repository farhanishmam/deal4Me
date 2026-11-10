"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PhotoSlot } from "@/components/shared/PhotoSlot";
import { Button } from "@/components/ui/button";
import { useItem } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useRc } from "./RentalCopy";
import { samplePhotos } from "./terms";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type Msg = { type: string; size: string; read: string };

/** Upload errors. RentalCopy.ts is shared, so these live here, English and Japanese. */
const MSG: Record<"en" | "ja", Msg> = {
  en: {
    type: "Choose a JPEG, PNG, WebP or GIF photo.",
    size: "Each photo must be 5 MB or smaller.",
    read: "Could not read this photo.",
  },
  ja: {
    type: "JPEG、PNG、WebP、GIFの写真を選んでください。",
    size: "写真は1枚5MB以下にしてください。",
    read: "この写真を読み込めませんでした。",
  },
};

/**
 * The real api only takes JPEG/PNG/WebP/GIF data URIs, so the sample SVGs are drawn onto a
 * canvas first. A "scratch" sample gets visible scratch marks painted on the gear.
 */
async function rasterize(src: string, scratch: boolean): Promise<string> {
  const img = new Image();
  img.src = src.split("?")[0];
  await img.decode();
  const w = 640;
  const h = 480;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if (scratch) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const marks: [number, number][][] = [
      [[170, 205], [235, 238], [300, 222], [372, 262], [440, 247]],
      [[205, 300], [270, 322], [338, 306], [410, 338]],
    ];
    for (const m of marks) {
      for (const [color, width] of [["#2b2f36", 7], ["#ffffff", 2.5]] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        m.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    }
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readPhoto(file: File, m: Msg): Promise<string> {
  if (!PHOTO_TYPES.has(file.type)) return Promise.reject(new Error(m.type));
  if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error(m.size));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(m.read));
    reader.readAsDataURL(file);
  });
}

export function PhotoStep({
  itemId,
  cta,
  stages,
  onSubmit,
  onCancel,
  scratchToggle = false,
}: {
  itemId: string;
  cta: string;
  stages: string[];
  onSubmit: (photos: string[]) => Promise<unknown>;
  onCancel?: () => void;
  /** Return step only: show the "Demo: add a scratch" switch. */
  scratchToggle?: boolean;
}) {
  const { t, lang } = useRc();
  const item = useItem(itemId);
  const canSample = samplePhotos(item).length > 0;
  const msg = MSG[lang === "ja" ? "ja" : "en"];
  const [photos, setPhotos] = useState<(string | undefined)[]>([undefined, undefined, undefined]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scratch, setScratch] = useState(false);
  const [sampled, setSampled] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const activeSlot = useRef(0);
  const full = photos.every(Boolean);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const src = await readPhoto(file, msg);
      const slot = activeSlot.current;
      setPhotos((current) => current.map((value, index) => index === slot ? src : value));
      setSampled(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("failed"));
    }
  }

  async function fillSamples(withScratch: boolean) {
    setError(null);
    try {
      const sources = samplePhotos(item, withScratch);
      if (!sources.length) return;
      const raster = await Promise.all(sources.map((src) => rasterize(src, src.endsWith("?scratch=1"))));
      setPhotos(raster);
      setSampled(true);
    } catch {
      setError(t("failed"));
    }
  }

  function toggleScratch() {
    const next = !scratch;
    setScratch(next);
    if (sampled) void fillSamples(next);
  }

  async function submit() {
    if (!full || busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(photos as string[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 animate-rise flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-[-0.018em]">{t("photoTitle")}</h2>
        <span className="text-[15px] text-muted-foreground tabular-nums">{photos.filter(Boolean).length}/3</span>
      </div>
      <input
        ref={picker}
        id={`photos-${itemId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          void choose(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="grid grid-cols-3 gap-3">
        {photos.map((src, index) => src ? (
          <PhotoSlot
            key={index}
            state="identified"
            src={src}
            onRemove={busy ? undefined : () => {
              setSampled(false);
              setPhotos((current) => current.map((value, slot) => slot === index ? undefined : value));
            }}
          />
        ) : (
          <PhotoSlot
            key={index}
            state="empty"
            onClick={busy ? undefined : () => {
              activeSlot.current = index;
              picker.current?.click();
            }}
          />
        ))}
      </div>
      <div className="-mt-2 flex items-center justify-between gap-3">
        {canSample ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void fillSamples(scratchToggle && scratch)}
            className="h-11 rounded-lg text-[15px] font-medium text-primary outline-none transition-colors duration-150 hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-40"
          >
            {t("sample")}
          </button>
        ) : <span />}
        {scratchToggle && canSample && (
          <button
            type="button"
            role="switch"
            aria-checked={scratch}
            disabled={busy}
            onClick={toggleScratch}
            className="flex h-11 items-center gap-2 rounded-lg text-[15px] text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-40"
          >
            {t("scratch")}
            <span className={cn("flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150", scratch ? "bg-primary" : "bg-muted")}>
              <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform duration-150", scratch && "translate-x-4")} />
            </span>
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-auto flex flex-col gap-1">
        <Button size="lg" className="h-12 w-full rounded-xl text-[17px] font-semibold" disabled={!full || busy} onClick={submit}>
          {busy ? <><Loader2 className="animate-spin" />{stages[0]}</> : cta}
        </Button>
        {onCancel && <button type="button" disabled={busy} onClick={onCancel} className="h-11 rounded-lg text-[15px] text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-40">{t("cancel")}</button>}
      </div>
    </div>
  );
}
