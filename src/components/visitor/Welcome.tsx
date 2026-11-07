"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BatteryFull, Check, ChevronLeft, Signal, Wifi } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { APP_TIME_ZONE, money } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { VisitorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LANGUAGES, useT, type Key } from "./i18n";

type Interest = VisitorProfile["interests"][number];

const INTERESTS: { id: Interest; key: Key }[] = [
  { id: "ski", key: "interest.ski" },
  { id: "food", key: "interest.food" },
  { id: "explore", key: "interest.explore" },
];

const BUDGET_MIN = 50;
const BUDGET_MAX = 1000;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO instant to the "2026-11-07" value a date input wants, in Salt Lake City time. */
function toInputDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dayFormat.format(d);
}

/** "2026-11-07" back to an ISO instant at midday, so the day holds in any zone. */
function fromInputDate(day: string): string {
  return new Date(`${day}T19:00:00.000Z`).toISOString();
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function Welcome() {
  // /visit#trip opens the second step directly.
  const deepLinked = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash === "#trip",
    () => false
  );
  const [picked, setPicked] = useState<1 | 2 | null>(null);
  const step = picked ?? (deepLinked ? 2 : 1);
  return step === 1 ? <LanguageStep onNext={() => setPicked(2)} /> : <TripStep onBack={() => setPicked(1)} />;
}

function Steps({ current, tone }: { current: 1 | 2; tone: "ink" | "default" }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`${current} / 2`}>
      {[1, 2].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1 w-6 rounded-full transition-colors duration-300",
            n <= current
              ? tone === "ink"
                ? "bg-ink-foreground"
                : "bg-foreground"
              : tone === "ink"
                ? "bg-ink-border"
                : "bg-border"
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step one: language                                                  */
/* ------------------------------------------------------------------ */

function LanguageStep({ onNext }: { onNext: () => void }) {
  const { lang, t } = useT();
  const setVisitor = useStore((s) => s.setVisitor);

  return (
    <div className="flex-1">
      {/*
        Covers the whole screen, status bar included. Positioned against the
        phone screen (the nearest positioned ancestor), not the scroll area.
      */}
      <div className="absolute inset-0 z-[35] flex flex-col overflow-hidden bg-ink text-ink-foreground">
        {/* ridgeline, faded into the ink */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ridge-dark.svg"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-x-0 top-0 h-[400px] w-full object-cover object-[50%_40%] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        />

        {/* device chrome in light tones, only on the framed phone */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-12 items-center justify-between px-8 sm:flex"
        >
          <span className="text-[14px] font-semibold tracking-tight tabular-nums">9:41</span>
          <span className="absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1.5 [&_svg]:size-[15px]">
            <Signal />
            <Wifi />
            <BatteryFull className="size-[18px]!" />
          </span>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden h-1 w-[124px] -translate-x-1/2 rounded-full bg-ink-foreground/40 sm:block"
        />

        <div className="relative flex min-h-0 flex-1 flex-col px-6 pt-[max(env(safe-area-inset-top),0px)] sm:pt-12">
          <div className="flex h-14 shrink-0 items-center justify-between">
            <Logo tone="ink" />
            <Steps current={1} tone="ink" />
          </div>

          <h1 className="mt-[104px] shrink-0 text-[40px] leading-[1.06] font-bold tracking-[-0.032em] whitespace-pre-line animate-rise">
            {t("welcome.headline")}
          </h1>

          <div
            role="radiogroup"
            aria-label={t("welcome.language")}
            className="mt-7 flex flex-col gap-0.5 animate-rise [animation-delay:80ms]"
          >
            {LANGUAGES.map(({ code, name, short }) => {
              const selected = code === lang;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  lang={code}
                  onClick={() => setVisitor({ language: code })}
                  className={cn(
                    "flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-[17px] transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ink-foreground/25",
                    selected
                      ? "bg-ink-raised font-semibold text-ink-foreground"
                      : "text-ink-muted hover:bg-ink-raised/60 hover:text-ink-foreground"
                  )}
                >
                  <span>{name}</span>
                  {selected ? (
                    <Check className="size-5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <span className="font-mono text-[11px] tracking-wider opacity-60" aria-hidden>
                      {short}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto shrink-0 pt-5 pb-8">
            <Button size="lg" className="h-12 w-full" onClick={onNext}>
              {t("common.continue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step two: the trip                                                  */
/* ------------------------------------------------------------------ */

function TripStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { t } = useT();
  const visitor = useStore((s) => s.visitor);
  const setVisitor = useStore((s) => s.setVisitor);

  const start = toInputDate(visitor.tripStart);
  const end = toInputDate(visitor.tripEnd);
  const budget = Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(visitor.budgetCents / 100)));

  const changeStart = (day: string) => {
    if (!day) return;
    const patch: Partial<VisitorProfile> = { tripStart: fromInputDate(day) };
    if (end && day > end) patch.tripEnd = fromInputDate(day);
    setVisitor(patch);
  };
  const changeEnd = (day: string) => {
    if (!day) return;
    setVisitor({ tripEnd: fromInputDate(day) });
  };
  const toggle = (id: Interest) => {
    const has = visitor.interests.includes(id);
    setVisitor({ interests: has ? visitor.interests.filter((x) => x !== id) : [...visitor.interests, id] });
  };

  return (
    <div key="trip" className="flex flex-1 flex-col px-4 animate-rise">
      <div className="flex h-14 shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("common.back")}
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-foreground transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
        >
          <ChevronLeft className="size-6" />
        </button>
        <Steps current={2} tone="default" />
      </div>

      <h1 className="mt-4 text-title">{t("trip.title")}</h1>

      <div className="mt-8 flex flex-col gap-10">
        <div className="grid grid-cols-2 divide-x divide-border rounded-xl border bg-card">
          <DateCell label={t("trip.arrive")} value={start} onChange={changeStart} />
          <DateCell label={t("trip.leave")} value={end} min={start} onChange={changeEnd} />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-label text-muted-foreground">{t("trip.interests")}</span>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(({ id, key }) => {
              const on = visitor.interests.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(id)}
                  className={cn(
                    "h-11 rounded-full border px-5 text-[15px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
                    on
                      ? "border-primary/25 bg-primary-soft text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted-foreground">{t("trip.budget")}</span>
            <span className="text-[40px] leading-none font-bold tracking-[-0.032em] tabular-nums">
              {money(budget * 100)}
            </span>
          </div>
          <Slider
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={10}
            value={[budget]}
            aria-label={t("trip.budget")}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              if (typeof next === "number") setVisitor({ budgetCents: next * 100 });
            }}
          />
        </div>
      </div>

      <div className="mt-auto shrink-0 pt-8 pb-[max(env(safe-area-inset-bottom),24px)] sm:pb-8">
        <Button size="lg" className="h-12 w-full" onClick={() => router.push("/visit/home")}>
          {t("trip.cta")}
        </Button>
      </div>
    </div>
  );
}

function DateCell({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (day: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 px-4 py-3.5 transition-colors duration-150 first:rounded-l-xl last:rounded-r-xl focus-within:bg-primary-soft/50">
      <span className="text-label text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full min-w-0 bg-transparent font-sans text-[16px] font-semibold tabular-nums outline-none [&::-webkit-calendar-picker-indicator]:opacity-40"
      />
    </label>
  );
}
