"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, SearchX, Sparkles, Tag } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemSummary } from "@/components/shared/ItemSummary";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useHydrated, useStore } from "@/lib/store";
import type { Negotiation, NegotiationRound } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bubble } from "./Bubble";
import { useT } from "./strings";

type Mode = "agent" | "manual";
type Phase = "setup" | "running" | "done";

const VISIBLE_ROWS = 3;

/** The server blanks each buyer's private maximum, so a saved chat falls back to the best price it shows. */
const savedMaxCents = (n: Negotiation) =>
  n.visitorMaxCents ||
  Math.max(n.agreedDailyCents ?? 0, ...n.rounds.filter((r) => r.by === "visitor").map((r) => r.offerCents)) ||
  n.askingCents;

export function NegotiateScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const { t } = useT();
  const item = useStore((s) => s.items.find((i) => i.id === itemId));
  const shop = useStore((s) => s.shops.find((x) => x.id === item?.shopId));

  const router = useRouter();
  const negId = search.get("negotiation");
  const saved = useStore((s) =>
    negId ? s.negotiations.find((n) => n.id === negId) : undefined,
  );

  const [liveMode, setMode] = useState<Mode>("agent");
  const [maxChoice, setMaxChoice] = useState<number | null>(null);
  const [livePhase, setPhase] = useState<Phase>("setup");
  const [liveRounds, setRounds] = useState<NegotiationRound[]>([]);
  const [liveNegotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);
  const mounted = useRef(true);
  const run = useRef(0);
  // Aborts the agent run's stream: leaving the screen or starting over must stop the server's Haiku calls.
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);

  // A typing bubble appears whenever a round lands, a run starts or the manual
  // request goes out, so these deps keep it in view along with the latest round.
  useEffect(() => {
    if (liveRounds.length > 0) end.current?.scrollIntoView({ block: "nearest" });
  }, [liveRounds.length, livePhase, busy]);

  // Rentals negotiate a daily fee; a sale item negotiates its one-off price.
  const sale = item?.kind === "sale";
  const askingCents = sale ? (item?.priceCents ?? 0) : (item?.rental?.dailyFeeCents ?? 0);
  if (!item || (sale ? askingCents <= 0 : !item.rental)) {
    if (!hydrated) return <div className="flex-1" aria-busy />;
    return (
      <EmptyState
        icon={<SearchX />}
        title={t("notFound")}
        action={
          <Link
            href="/visit/home"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("back")}
          </Link>
        }
      />
    );
  }

  // A saved negotiation for this item opens read-only until a new one is started.
  const view = saved && saved.itemId === item.id && !fresh ? saved : undefined;
  const missing = !!negId && hydrated && !saved && !fresh;
  const rounds = view ? view.rounds : liveRounds;
  const negotiation = view ?? liveNegotiation;
  const phase: Phase = view ? "done" : livePhase;
  const mode: Mode = view?.mode ?? liveMode;
  const asking = Math.round(askingCents / 100);
  const days = sale
    ? 1
    : view
      ? view.days
      : Math.min(
          item.rental?.maxDays ?? 1,
          Math.max(1, parseInt(search.get("days") ?? "", 10) || 3),
        );
  const savedMax = view ? Math.round(savedMaxCents(view) / 100) : 0;
  const sliderMin = Math.min(
    Math.max(1, Math.round(asking / 2)),
    savedMax || Infinity,
  );
  const sliderMax = Math.max(asking, savedMax);
  const defaultMax = Math.min(
    asking,
    Math.max(sliderMin, Math.round(asking * (sale ? 0.9 : 0.75))),
  );
  const maxDollars = view
    ? savedMax
    : Math.min(asking, Math.max(sliderMin, maxChoice ?? defaultMax));
  const owner = shop?.ownerFirstName ?? "";
  const ownerName = owner ? t("ownerAgent", { name: owner }) : t("sellerAgent");
  const yourName = mode === "agent" ? t("yourAgent") : t("you");
  const maxRounds = negotiation?.maxRounds ?? 6;
  const round = Math.min(maxRounds, Math.max(1, ...rounds.map((r) => r.n)));
  const isLive = (id: number) => mounted.current && run.current === id;

  const message = (e: unknown) =>
    e instanceof Error && e.message ? e.message : t("error");

  const leaveView = () => {
    if (!view) return;
    setFresh(true);
    router.replace(`/visit/negotiate/${item.id}${sale ? "" : `?days=${days}`}`, { scroll: false });
  };

  const finish = (result: Negotiation) => {
    useStore.getState().stopTimer("deal");
    setNegotiation(result);
    setPhase("done");
  };

  const settle = (id: number, result: Negotiation) => {
    if (!isLive(id)) return;
    setRounds(result.rounds);
    setBusy(false);
    if (result.status === "running") setNegotiation(result);
    else finish(result);
  };

  const start = async (as: Mode) => {
    const id = ++run.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    leaveView();
    setMode(as);
    setError(null);
    setDraft(null);
    setRounds([]);
    setNegotiation(null);
    setOpen(false);
    setPhase("running");
    setBusy(true);
    useStore.getState().startTimer("deal");
    try {
      const result = await api.startNegotiation(
        { itemId: item.id, days, visitorMaxCents: maxDollars * 100, mode: as },
        { onRound: (r) => isLive(id) && setRounds((prev) => [...prev, r]), signal: controller.signal },
      );
      settle(id, result);
    } catch (e) {
      if (run.current !== id) return;
      useStore.getState().stopTimer("deal");
      if (!mounted.current) return;
      setBusy(false);
      setPhase("setup");
      // Back to agent mode, so a failed manual start does not leave a disabled composer behind.
      setMode("agent");
      setError(message(e));
    }
  };

  const sendOffer = async (dollars: number) => {
    if (!negotiation) return;
    const id = ++run.current;
    const last = rounds[rounds.length - 1];
    setError(null);
    setDraft(null);
    setBusy(true);
    // The same line is shown now and sent to the server, so the bubble never changes when the reply lands.
    const line = t(rounds.some((r) => r.by === "visitor") ? "counterManual" : "openManual");
    setRounds((prev) => [
      ...prev,
      {
        n: (last?.n ?? 0) + 1,
        by: "visitor",
        offerCents: dollars * 100,
        message: line,
        at: new Date().toISOString(),
      },
    ]);
    try {
      settle(
        id,
        await api.submitManualOffer(negotiation.id, dollars * 100, line),
      );
    } catch (e) {
      if (!isLive(id)) return;
      setRounds(negotiation.rounds);
      setBusy(false);
      setDraft(dollars);
      setError(message(e));
    }
  };

  const reset = (next: Mode) => {
    leaveView();
    run.current += 1;
    abort.current?.abort();
    useStore.getState().stopTimer("deal");
    setMode(next);
    setPhase("setup");
    setRounds([]);
    setNegotiation(null);
    setBusy(false);
    setOpen(false);
    setError(null);
    setDraft(null);
  };

  const pickMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "manual") void start("manual");
    else reset("agent");
  };

  // Rows: every round, plus the next speaker's typing bubble while one is expected.
  const lastRound = rounds[rounds.length - 1];
  const typing: "owner" | "visitor" | undefined =
    phase !== "running"
      ? undefined
      : mode === "agent"
        ? !lastRound || lastRound.by === "visitor"
          ? "owner"
          : "visitor"
        : busy
          ? "owner"
          : undefined;
  const rowCount = rounds.length + (typing ? 1 : 0);
  const hidden = view ? 0 : Math.max(0, rowCount - VISIBLE_ROWS);
  const firstShown = open ? 0 : hidden;

  // Rounds are append-only, so a row's index is a stable key: it survives settle() swapping in the
  // server rounds and cannot collide when several turns share a round number. Only the newest
  // bubble of a live negotiation types itself out.
  const liveIndex = !view ? rounds.length - 1 : -1;
  const renderRound = (r: NegotiationRound, i: number) => (
    <Bubble
      key={i}
      side={r.by}
      name={r.by === "owner" ? ownerName : yourName}
      price={sale ? money(r.offerCents) : t("perDay", { price: money(r.offerCents) })}
      message={r.message}
      live={i === liveIndex}
    />
  );

  const lastOwner = [...rounds].reverse().find((r) => r.by === "owner");
  // The agent offers exactly the picked price, so a manual offer starts from it and steps down only
  // below the owner's last counter.
  const suggested = Math.max(
    1,
    Math.min(maxDollars, lastOwner ? Math.round(lastOwner.offerCents / 100) - 1 : maxDollars),
  );

  const agreed =
    negotiation?.status === "deal" ? negotiation.agreedDailyCents : undefined;
  const settled = phase === "done" && negotiation;
  const slidersLocked = phase === "running" || !!view;
  const segmentsLocked =
    phase === "done" || (phase === "running" && mode === "agent");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <ScreenHeader
        title={t(sale ? "titleSale" : "title")}
        backHref={`/visit/item/${item.id}`}
        aside={
          view ? (
            <button
              type="button"
              onClick={() => {
                setMaxChoice(savedMax);
                reset("agent");
              }}
              className="h-8 rounded-lg px-1 text-[15px] font-medium text-info outline-none focus-visible:ring-3 focus-visible:ring-info/25"
            >
              {t("startNew")}
            </button>
          ) : (
            <span className="rounded-md bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
              {t("badge")}
            </span>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-2">
        <div className="[&_img]:w-[117px] [&_p+p]:text-foreground/80">
          <ItemSummary
            item={item}
            lines={[
              [owner, shop?.neighborhood].filter(Boolean).join(" · ") || (shop?.name ?? ""),
              ...(sale ? [] : [days === 1 ? t("day") : t("days", { n: days })]),
            ]}
          />
        </div>

        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[17px] font-bold">{t(sale ? "saleLabel" : "maxLabel")}</p>
            <p className="text-[24px] leading-6 font-bold tracking-[-0.02em] tabular-nums">
              {money(maxDollars * 100)}
            </p>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-sm text-foreground/80">
            <span className="flex items-center gap-1.5">
              <Tag className="size-4" aria-hidden />
              {t("private")}
            </span>
            {phase === "running" && mode === "agent" && (
              <span className="font-medium tabular-nums" aria-live="polite">
                {t("round", { n: round, m: maxRounds })}
              </span>
            )}
          </div>
          <Slider
            className="mt-3.5 [&_[data-slot=slider-thumb]]:size-[26px] [&_[data-slot=slider-thumb]]:border-[1.5px]"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[maxDollars]}
            disabled={slidersLocked}
            onValueChange={(v) => {
              if (phase === "done") reset("agent");
              setMaxChoice(Array.isArray(v) ? v[0] : v);
            }}
            aria-label={t(sale ? "saleLabel" : "maxLabel")}
          />
        </div>

        <div
          role="radiogroup"
          aria-label="Mode"
          className="mt-5 grid h-8 shrink-0 grid-cols-2 rounded-[14px] bg-muted p-0"
        >
          {(["agent", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              disabled={segmentsLocked}
              onClick={() => pickMode(m)}
              className={cn(
                "rounded-[14px] text-[15px] transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/25 disabled:cursor-default",
                mode === m
                  ? "bg-info font-semibold text-white"
                  : "font-medium text-foreground",
              )}
            >
              {t(m)}
            </button>
          ))}
        </div>

        <ScrollArea className="mt-3 min-h-0 flex-1">
          {rowCount === 0 && phase === "setup" ? (
            <p className="flex h-full min-h-24 items-center justify-center gap-2 text-center text-[15px] text-muted-foreground">
              <Sparkles className="size-4 shrink-0 text-info" aria-hidden />
              {t(mode === "agent" ? "calm" : "manualCalm")}
            </p>
          ) : (
            <div
              className={cn(
                "flex w-full min-w-0 flex-col gap-2 pr-2.5",
                settled && hidden > 0 && "min-h-full justify-between",
              )}
            >
              {rounds.slice(firstShown).map((r, i) => renderRound(r, firstShown + i))}
              {typing && (
                <Bubble
                  side={typing}
                  name={typing === "owner" ? ownerName : yourName}
                  typing
                  status={t("thinking")}
                />
              )}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  className="mx-auto flex h-6 items-center gap-1 text-[15px] font-medium text-info outline-none focus-visible:ring-3 focus-visible:ring-info/25"
                >
                  {t("earlier")}
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-150",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              )}
              <div ref={end} aria-hidden className="-mt-2 h-px shrink-0" />
            </div>
          )}
        </ScrollArea>

        <div className="mt-1 shrink-0">
          {error && (
            <div role="alert" className="mb-2 text-center text-sm leading-snug">
              <p className="text-destructive">{error}</p>
              <p className="text-muted-foreground">{t("errorHint")}</p>
            </div>
          )}
          {missing && !error && phase === "setup" && (
            <p className="mb-2 text-center text-sm text-muted-foreground">
              {t("missing")}
            </p>
          )}
          {settled && agreed !== undefined ? (
            <div className="animate-rise border-t border-border pt-2.5">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-success px-3 text-[14px] font-semibold text-white">
                <Check className="size-4" strokeWidth={2.5} aria-hidden />
                {t("dealAgreed")}
              </span>
              {sale ? (
                <>
                  <p className="mt-1.5 text-[26px] leading-8 font-bold tracking-[-0.02em] tabular-nums">
                    {t("saleFee", { fee: money(agreed) })}
                  </p>
                  {negotiation.askingCents > agreed && (
                    <p className="text-[15px] leading-5 font-bold text-success tabular-nums">
                      {t("save", { amount: money(negotiation.askingCents - agreed) })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-[26px] leading-8 font-bold tracking-[-0.02em] tabular-nums">
                    {t("fee", { fee: money(agreed * days) })}
                  </p>
                  <p className="text-[15px] leading-5 text-foreground tabular-nums">
                    {t(days === 1 ? "breakdownOne" : "breakdown", { days, price: money(agreed) })} ·{" "}
                    <span className="font-bold text-success">
                      {t("save", {
                        amount: money((negotiation.askingCents - agreed) * days),
                      })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[15px] leading-5 text-foreground/80 tabular-nums">
                    {t("deposit", { deposit: money(item.rental?.depositCents ?? 0) })}
                  </p>
                </>
              )}
              <Link
                href={
                  sale
                    ? `/visit/item/${item.id}?negotiation=${negotiation.id}&request=1`
                    : `/visit/checkout/${item.id}?negotiation=${negotiation.id}`
                }
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-2.5 h-12 w-full rounded-xl text-[17px] font-semibold",
                )}
              >
                {sale ? t("requestAtPrice", { price: money(agreed) }) : t("review")}
              </Link>
              <Link
                href={`/visit/messages/${negotiation.id}`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "mt-0.5 h-10 w-full rounded-xl text-[15px] font-semibold text-info hover:text-info",
                )}
              >
                {t("messageSeller")}
              </Link>
            </div>
          ) : settled ? (
            <div className="animate-rise border-t border-border pt-3">
              <p className="text-center text-[15px] text-muted-foreground">
                {negotiation.status === "running" ? t("unfinished") : t("noDeal")}
              </p>
              <Button
                variant="outline"
                className="mt-3 h-12 w-full rounded-xl text-[17px] font-semibold"
                onClick={() => {
                  setMaxChoice(
                    negotiation.status === "running"
                      ? maxDollars
                      : Math.max(defaultMax, Math.min(asking, maxDollars + 5)),
                  );
                  reset("agent");
                }}
              >
                {negotiation.status === "running" ? t("startNew") : t("raise")}
              </Button>
            </div>
          ) : mode === "manual" ? (
            <Composer
              key={`${lastOwner?.n ?? 0}-${rounds.length}`}
              suggested={draft ?? suggested}
              busy={busy || !lastOwner}
              onSend={sendOffer}
              label={t(sale ? "offerSale" : "offer")}
            />
          ) : (
            <Button
              className="h-12 w-full rounded-xl text-[17px] font-semibold"
              disabled={phase === "running"}
              onClick={() => start("agent")}
            >
              {t(phase === "running" ? "negotiating" : "start")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({
  suggested,
  busy,
  onSend,
  label,
}: {
  suggested: number;
  busy: boolean;
  onSend: (dollars: number) => void;
  label: string;
}) {
  const { t } = useT();
  const [offer, setOffer] = useState(String(suggested));
  const dollars = Number(offer);
  const valid = Number.isInteger(dollars) && dollars > 0;
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) onSend(dollars);
      }}
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[17px] font-semibold text-muted-foreground">
          $
        </span>
        <input
          inputMode="numeric"
          value={offer}
          onChange={(e) =>
            setOffer(e.target.value.replace(/\D/g, "").slice(0, 3))
          }
          disabled={busy}
          className="h-12 w-full rounded-xl border border-input bg-background pr-4 pl-8 text-[17px] font-semibold tabular-nums outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-60"
        />
      </label>
      <Button
        type="submit"
        disabled={busy || !valid}
        className="h-12 w-28 rounded-xl text-[17px] font-semibold"
      >
        {t("send")}
      </Button>
    </form>
  );
}
