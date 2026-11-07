"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Search, SearchX, Sparkles, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Item, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EatCard, GearCard } from "./Cards";
import { formatRange, useT } from "./i18n";

const ROW =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function includes(haystack: (string | undefined)[], needle: string) {
  return haystack.some((h) => h?.toLowerCase().includes(needle));
}

export function Discover() {
  const { lang, t } = useT();
  const visitor = useStore((s) => s.visitor);
  const items = useStore((s) => s.items);
  const shops = useStore((s) => s.shops);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const { gear, eat } = useMemo(() => {
    const shopById = new Map<string, Shop>(shops.map((s) => [s.id, s]));
    const gearItems: { item: Item; shop: Shop }[] = [];
    const foodByShop = new Map<string, Item[]>();
    for (const item of items) {
      const shop = shopById.get(item.shopId);
      if (!shop || !item.available) continue;
      if (item.kind === "rental" && item.rental) gearItems.push({ item, shop });
      if (item.kind === "food") foodByShop.set(shop.id, [...(foodByShop.get(shop.id) ?? []), item]);
    }

    const gear = gearItems.filter(
      ({ item, shop }) =>
        !q ||
        includes(
          [item.name, item.category, item.description, ...(item.tags ?? []), shop.name, shop.ownerFirstName, shop.neighborhood],
          q
        )
    );
    const eat = shops.filter((shop) => {
      const foods = foodByShop.get(shop.id);
      if (!foods) return false;
      return (
        !q ||
        includes(
          [shop.name, shop.neighborhood, shop.storefront.tagline, ...foods.flatMap((f) => [f.name, f.category, ...(f.tags ?? [])])],
          q
        )
      );
    });
    return { gear, eat };
  }, [items, shops, q]);

  const nothing = gear.length === 0 && eat.length === 0;

  return (
    <div className="flex flex-col gap-8 px-4 pt-6 pb-10">
      <header className="animate-rise">
        <h1 className="text-title">{t("home.greeting", { name: visitor.firstName })}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">
          {formatRange(lang, visitor.tripStart, visitor.tripEnd)}
        </p>
      </header>

      <div className="relative -mt-2 animate-rise [animation-delay:60ms]">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("home.search")}
          aria-label={t("home.search")}
          enterKeyHint="search"
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-input bg-card pr-12 pl-11 text-[15px] transition-colors duration-150 outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("home.clear")}
            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!q && <MountainCard />}

      {gear.length > 0 && (
        <Section title={t("home.gear")} delay={120}>
          <div className={ROW}>
            {gear.map(({ item, shop }) => (
              <GearCard key={item.id} item={item} shop={shop} />
            ))}
          </div>
        </Section>
      )}

      {eat.length > 0 && (
        <Section title={t("home.eat")} delay={180}>
          <div className={ROW}>
            {eat.map((shop) => (
              <EatCard key={shop.id} shop={shop} />
            ))}
          </div>
        </Section>
      )}

      {nothing ? (
        <EmptyState
          icon={<SearchX />}
          title={t("home.emptyTitle", { q: query.trim() })}
          description={t("home.emptyBody")}
          action={
            <Link href="/visit/agent" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {t("home.agentTitle")}
            </Link>
          }
          className="animate-rise py-10"
        />
      ) : (
        <Link
          href="/visit/agent"
          className="group flex animate-rise items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-150 outline-none hover:border-input focus-visible:ring-3 focus-visible:ring-primary/15 [animation-delay:240ms]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-heading">{t("home.agentTitle")}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{t("home.agentBody")}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: ReactNode }) {
  return (
    <section className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-3 text-heading">{title}</h2>
      {children}
    </section>
  );
}

/** Sample numbers only. The pill says so. */
function MountainCard({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <div className={cn("animate-rise rounded-2xl bg-ink p-5 text-ink-foreground [animation-delay:90ms]", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{t("mountain.title")}</h2>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-ink-border px-2.5 text-[11px] font-semibold text-ink-muted">
          {t("mountain.sample")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-ink-border">
        <div className="flex flex-col gap-1 pr-4">
          <span className="text-label text-ink-muted">{t("mountain.snow")}</span>
          <span className="text-metric tabular-nums">{t("mountain.snowValue")}</span>
        </div>
        <div className="flex flex-col gap-1 pl-5">
          <span className="text-label text-ink-muted">{t("mountain.temp")}</span>
          <span className="text-metric tabular-nums">{t("mountain.tempValue")}</span>
        </div>
      </div>
    </div>
  );
}
