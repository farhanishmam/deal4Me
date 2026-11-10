"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mic, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { PHOTOS, thumbFor } from "@/lib/photos";
import { useVoiceInput } from "@/lib/real/useVoiceInput";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import { askText, type AskKey } from "./strings";

const href = (q: string) => (q ? `/visit/agent?q=${encodeURIComponent(q)}` : "/visit/agent");
const searchHref = (q: string) => (q ? `/visit/search?q=${encodeURIComponent(q)}` : "/visit/search");

export function Ask() {
  const router = useRouter();
  const visitor = useStore((s) => s.visitor);
  const setVisitor = useStore((s) => s.setVisitor);
  const shops = useStore((s) => s.shops);
  const items = useStore((s) => s.items);
  const nearby = shops.find((shop) => shop.liveAt && shop.sellerKind === "local") ?? shops.find((shop) => shop.liveAt);
  const featured = items.find((item) => item.available && item.rental && shops.some((shop) => shop.id === item.shopId && shop.liveAt));
  const lang = visitor.language;
  const t = (key: AskKey, vars?: Record<string, string | number>) => askText(lang, key, vars);

  const [value, setTyped] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const transcriptInput = useRef<HTMLTextAreaElement>(null);

  const sample = t("sample");
  const query = value.trim();

  const voice = useVoiceInput({
    onPartialText: setTyped,
    onText: (text) => {
      setTyped(text);
    },
  });
  const listening = voice.state === "listening";
  const voiceBusy = voice.state !== "idle";

  useEffect(() => {
    const input = transcriptInput.current;
    if (voiceBusy && input) input.scrollTop = input.scrollHeight;
  }, [value, voiceBusy]);

  function listen() {
    if (voice.state === "idle") {
      setUsedVoice(true);
    }
    voice.toggle();
  }

  return (
    <div className="flex flex-1 flex-col bg-card">
      <header className="flex items-center justify-between px-4 pt-2 max-sm:pt-8">
        <h1 className="text-[17px] leading-6 font-semibold">{BRAND.name}</h1>
        <LanguageToggle lang={lang} label={t("language")} onChange={(language) => setVisitor({ language })} />
      </header>

      <div className="flex flex-1 flex-col px-4 pt-3 pb-3">
        <div className="mt-3">
          <p className="text-[15px] leading-5 text-muted-foreground">{visitor.firstName ? t("hi", { name: visitor.firstName }) : t("hiThere")}</p>
          <h2 className="mt-1 text-[32px] leading-9 font-bold tracking-[-0.045em] whitespace-nowrap">{t("headline")}</h2>
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!voiceBusy) router.push(searchHref(query));
          }}
        >
          <div
            className={cn(
              "relative flex min-h-12 items-end gap-1 rounded-xl border bg-card pr-1.5 pl-11 transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15",
              voiceBusy ? "border-info/50 bg-info-soft/40" : "border-foreground/20"
            )}
          >
            <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-3 left-3.5 size-[22px] text-muted-foreground" />
            <textarea
              ref={transcriptInput}
              value={value}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!voiceBusy) router.push(searchHref(query));
                }
              }}
              rows={usedVoice ? 3 : 1}
              placeholder={voiceBusy ? t("listening") : t("placeholder")}
              aria-label={t("placeholder")}
              readOnly={voiceBusy}
              enterKeyHint="search"
              autoComplete="off"
              className={cn(
                "min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[17px] leading-6 outline-none placeholder:text-muted-foreground",
                voiceBusy && "placeholder:text-info"
              )}
            />
            <button
              type="button"
              onClick={listen}
              aria-label={listening ? t("stopMic") : t("mic")}
              aria-pressed={listening}
              disabled={voice.state === "processing"}
              className="relative mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-info transition-colors duration-150 outline-none hover:bg-info-soft focus-visible:ring-3 focus-visible:ring-info/20 active:scale-95 disabled:opacity-50"
            >
              {listening && <span aria-hidden className="absolute inset-1.5 animate-ping rounded-full bg-info/20" />}
              {voice.state === "processing" ? <Loader2 className="relative size-6 animate-spin" /> : <Mic className="relative size-6" />}
            </button>
          </div>
          {(voiceBusy || (usedVoice && value.trim())) && <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{listening ? t("recording") : voice.state === "processing" ? t("processing") : t("review")}</p>}
          {voice.error && <p role="alert" className="mt-2 text-sm text-destructive">{voice.error}</p>}

          <button
            type="button"
            onClick={() => router.push(href(query))}
            disabled={voiceBusy}
            className={cn(buttonVariants({ size: "lg" }), "mt-3 h-12 w-full gap-4 rounded-xl text-[19px] font-semibold")}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
              <path d="M10 5c.9 4.6 3.4 7.1 8 8-4.6.9-7.1 3.4-8 8-.9-4.6-3.4-7.1-8-8 4.6-.9 7.1-3.4 8-8Z" />
              <path d="M18.5 2c.3 1.6 1.2 2.5 2.8 2.8-1.6.3-2.5 1.2-2.8 2.8-.3-1.6-1.2-2.5-2.8-2.8 1.6-.3 2.5-1.2 2.8-2.8Z" />
            </svg>
            {t("cta")}
          </button>
        </form>

        <p className="mt-2.5 text-center text-[13px] leading-5 text-muted-foreground">{t("approve")}</p>

        <div className="mt-5 grid min-h-[160px] flex-1 grid-cols-2 gap-3">
          <Tile src={PHOTOS.rentGear} label={t("rent")} to={href(sample)} framing="object-[38%_50%]" />
          <Tile src={PHOTOS.findFood} label={t("eat")} to={href(t("food"))} />
        </div>

        {nearby && <Link
          href={`/s/${nearby.slug}`}
          className="mt-3 flex items-center gap-3 rounded-xl bg-muted/60 px-2.5 py-1.5 transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTOS.sugarHouse} alt="" className="h-14 w-[126px] shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] leading-5 font-bold">
              {nearby.neighborhood === "Sugar House" ? t("around") : nearby.name}
            </span>
            <span className="mt-0.5 flex items-center gap-2.5 text-[15px] leading-5 text-foreground/80">
              {t("nearby")}
              <ArrowRight className="size-[22px]" aria-hidden />
            </span>
          </span>
        </Link>}

        {featured?.rental && (
          <Link
            href={`/visit/item/${featured.id}`}
            className="mt-3 flex items-center gap-3 rounded-xl border border-border/50 bg-card py-2 pr-3 pl-2.5 transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbFor(featured)} alt="" className="h-[60px] w-[88px] shrink-0 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] leading-5 font-bold">
                {featured.name}
              </span>
              <span className="block text-[16px] leading-5 font-bold tabular-nums">
                {t("perDay", { price: money(featured.rental.dailyFeeCents) })}
              </span>
              <span className="block truncate text-[13px] leading-5 text-foreground/80 tabular-nums">
                {t("deposit", { deposit: money(featured.rental.depositCents) })}
              </span>
            </span>
            <ArrowRight className="size-[22px] shrink-0" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

function LanguageToggle({ lang, label, onChange }: { lang: Lang; label: string; onChange: (l: Lang) => void }) {
  const base = "flex min-h-11 items-center px-1 text-[15px] transition-colors duration-150 outline-none";
  return (
    <div role="group" aria-label={label} className="-mr-1 flex items-center">
      <button
        type="button"
        onClick={() => onChange("en")}
        aria-pressed={lang === "en"}
        className={cn(base, lang === "en" ? "font-medium text-foreground" : "text-foreground/80")}
      >
        EN
      </button>
      <span aria-hidden className="text-foreground/80">
        /
      </span>
      <button
        type="button"
        onClick={() => onChange("ja")}
        aria-pressed={lang === "ja"}
        className={cn(base, lang === "ja" ? "font-medium text-foreground" : "text-foreground/80")}
      >
        日本語
      </button>
    </div>
  );
}

function Tile({ src, label, to, framing = "object-right" }: { src: string; label: string; to: string; framing?: string }) {
  return (
    <Link
      href={to}
      className="group relative block min-h-[160px] overflow-hidden rounded-[14px] bg-muted outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={cn("absolute inset-0 size-full object-cover", framing)} />
      <span className="absolute inset-x-3.5 bottom-3 flex items-center justify-between text-[20px] leading-7 font-semibold text-white">
        {label}
        <ArrowRight strokeWidth={1.75} className="size-[26px] transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
