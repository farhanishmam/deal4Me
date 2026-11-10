"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import { useHydrated, useStore } from "@/lib/store";
import type { Item, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { searchText, type SearchKey } from "./strings";

interface Hit {
  item: Item;
  shop: Shop;
  score: number;
}

/** "Skis" and "ski" should find each other. */
const stem = (word: string) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word);

const STOP = new Set(
    "a an the and or of for to in on at with without by from my me i we you is are be can could would please want need looking find show get some any something anything good best nice new that this it its into about around near".split(" ")
  );

function find(items: Item[], shops: Shop[], query: string): Hit[] {
  const all = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const content = all.filter((w) => !STOP.has(w));
  const words = (content.length ? content : all).map(stem);
  const hits: Hit[] = [];
  for (const item of items) {
    if (!item.available) continue;
    const shop = shops.find((s) => s.id === item.shopId);
    if (!shop?.liveAt) continue;
    const name = item.name.toLowerCase();
    const rest = [item.category, ...(item.tags ?? []), shop.name].join(" ").toLowerCase();
    let score = 0;
    for (const word of words) {
      if (name.includes(word)) score += 2;
      else if (rest.includes(word)) score += 1;
    }
    if (score > 0 || words.length === 0) hits.push({ item, shop, score });
  }
  // Name matches first; the list order stays as it is otherwise.
  return hits.map((hit, i) => ({ hit, i })).sort((a, b) => b.hit.score - a.hit.score || a.i - b.i).map((x) => x.hit);
}

/** What the natural-language backend answered for one submitted query. */
interface Smart {
  query: string;
  ids: string[];
  summary: string;
}

async function askSearch(query: string, lang: string, signal: AbortSignal): Promise<Smart> {
  const res = await fetch("/api/ai/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, lang }),
    signal,
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = (await res.json()) as { matches?: { id: string }[]; summary?: string };
  return { query, ids: (data.matches ?? []).map((m) => m.id), summary: data.summary ?? "" };
}

export function Search() {
  const params = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const hydrated = useHydrated();
  const lang = useStore((s) => s.visitor.language);
  const items = useStore((s) => s.items);
  const shops = useStore((s) => s.shops);
  const t = (key: SearchKey, vars?: Record<string, string | number>) => searchText(lang, key, vars);

  const [smart, setSmart] = useState<Smart | null>(null);
  const [thinking, setThinking] = useState(() => Boolean(params.get("q")?.trim()));
  const inflight = useRef<AbortController | null>(null);
  useEffect(() => () => inflight.current?.abort(), []);

  const query = text.trim();
  const localHits = useMemo(() => find(items, shops, query), [items, shops, query]);
  // The assistant's answer stands only while the text is still what was submitted.
  const smartHits = useMemo(() => {
    if (!smart || smart.query !== query) return null;
    const rows: Hit[] = [];
    for (const id of smart.ids) {
      const item = items.find((i) => i.id === id);
      const shop = item && shops.find((s) => s.id === item.shopId);
      if (item && shop) rows.push({ item, shop, score: 0 });
    }
    return rows;
  }, [smart, query, items, shops]);
  const hits = smartHits ?? localHits;

  function run(q: string) {
    if (!q) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setThinking(true);
    const timer = setTimeout(() => controller.abort(), 45000);
    askSearch(q, lang, controller.signal)
      .then((answer) => {
        if (inflight.current === controller) setSmart(answer);
      })
      .catch(() => {
        // Quiet failure: the instant results stay as they are.
      })
      .finally(() => {
        clearTimeout(timer);
        if (inflight.current === controller) setThinking(false);
      });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query || thinking) return;
    run(query);
  }

  // A search sent from Home arrives as ?q=...; ask the assistant for it once.
  const initialQuery = params.get("q")?.trim() ?? "";
  useEffect(() => {
    if (!initialQuery) return;
    const id = setTimeout(() => run(initialQuery), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(value: string) {
    setText(value);
    // A new query cancels any search still running.
    inflight.current?.abort();
    inflight.current = null;
    setThinking(false);
    // Keep the address in step so Back from an item returns to the same search.
    const next = value.trim();
    window.history.replaceState(null, "", next ? `/visit/search?q=${encodeURIComponent(next)}` : "/visit/search");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <ScreenHeader title={t("title")} backHref="/visit/home" />

      <form onSubmit={submit} className="px-4 pt-1 pb-2">
        <div className="relative">
          <SearchIcon aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-[22px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={text}
            onChange={(e) => change(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            enterKeyHint="search"
            autoComplete="off"
            autoFocus
            className="h-12 w-full appearance-none rounded-xl border border-foreground/20 bg-card pr-11 pl-11 text-[17px] outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-3 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {text && (
            <button
              type="button"
              onClick={() => change("")}
              aria-label={t("clear")}
              className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {!hydrated ? (
          <p className="pt-6 text-center text-[15px] text-muted-foreground">{t("loading")}</p>
        ) : thinking ? (
          <p aria-live="polite" className="pt-6 text-center text-[15px] text-muted-foreground">{t("thinking")}</p>
        ) : hits.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-10 text-center">
            <p className="text-[16px] leading-6 text-muted-foreground">{query ? t("none", { q: query }) : t("noneListed")}</p>
            <Link
              href={query ? `/visit/agent?q=${encodeURIComponent(query)}` : "/visit/agent"}
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}
            >
              {t("ask")}
            </Link>
          </div>
        ) : (
          <>
            <p aria-live="polite" className="pb-2 text-[13px] leading-5 text-muted-foreground">
              {thinking ? t("thinking") : smartHits && smart?.summary ? smart.summary : hits.length === 1 ? t("countOne") : t("count", { n: hits.length })}
            </p>
            <ul className="flex flex-col gap-2">
              {hits.map(({ item, shop }) => (
                <li key={item.id}>
                  <Row item={item} shop={shop} t={t} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ item, shop, t }: { item: Item; shop: Shop; t: (key: SearchKey, vars?: Record<string, string | number>) => string }) {
  const to = item.kind === "food" ? `/visit/order/${shop.id}` : `/visit/item/${item.id}`;
  return (
    <Link
      href={to}
      className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbFor(item)} alt="" className="size-16 shrink-0 rounded-lg bg-muted object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] leading-5 font-semibold">{item.name}</span>
        {shop.name && <span className="block truncate text-[13px] leading-5 text-muted-foreground">{shop.name}</span>}
        {item.kind === "rental" && item.rental ? (
          <>
            <span className="block text-[15px] leading-5 font-semibold tabular-nums">{t("perDay", { price: money(item.rental.dailyFeeCents) })}</span>
            <span className="block truncate text-[12px] leading-4 text-muted-foreground tabular-nums">{t("deposit", { deposit: money(item.rental.depositCents) })}</span>
          </>
        ) : item.priceCents !== undefined ? (
          <span className="block text-[15px] leading-5 font-semibold tabular-nums">{money(item.priceCents)}</span>
        ) : null}
      </span>
    </Link>
  );
}
