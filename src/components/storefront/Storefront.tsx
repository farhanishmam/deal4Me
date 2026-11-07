"use client";

import "./storefront.css";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, LayoutGrid, Search, ShieldCheck, Sparkles, Store, Tag, X } from "lucide-react";
import { money } from "@/lib/format";
import { useShop, useStore } from "@/lib/store";
import type { Item, Lang, StorefrontConfig } from "@/lib/types";
import { storefrontFontClass } from "./fonts";
import { dictFor, fill, LANG_LABELS } from "./i18n";
import { ItemCard } from "./ItemCard";
import { initials, themeVars } from "./theme";
import { useCart } from "./useCart";

export interface StorefrontProps {
  config: StorefrontConfig;
  items: Item[];
  /** "preview" never uses fixed positioning or viewport units, so it fits in a panel. */
  mode: "preview" | "public";
  /** "phone" forces the phone layout whatever the width of the container. */
  device?: "desktop" | "phone";
}

type View = "home" | "all" | string;

function matches(item: Item, q: string): boolean {
  const hay = [item.name, item.description, item.category, ...(item.tags ?? [])].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

function itemPrice(item: Item): number {
  return item.kind === "rental" ? (item.rental?.dailyFeeCents ?? 0) : (item.priceCents ?? 0);
}

export function Storefront({ config, items, mode, device }: StorefrontProps) {
  const preview = mode === "preview";
  const shop = useShop(config.shopId);
  const visitorLang = useStore((s) => s.visitor.language);

  const languages = config.languages.length ? config.languages : (["en"] as Lang[]);
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const lang: Lang =
    pickedLang && languages.includes(pickedLang)
      ? pickedLang
      : !preview && languages.includes(visitorLang)
        ? visitorLang
        : languages[0];
  const t = dictFor(lang);

  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);

  // Order. The count and total live here, and are kept per shop in this browser.
  const { cart, add: addToOrder } = useCart(config.shopId, !preview);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const sections = useMemo(() => {
    const placed = new Set<string>();
    const list = config.sections
      .map((s) => {
        const own = s.itemIds.map((id) => byId.get(id)).filter((i): i is Item => !!i);
        own.forEach((i) => placed.add(i.id));
        return { id: s.id, title: s.title, items: own };
      })
      .filter((s) => s.items.length > 0);
    const rest = items.filter((i) => !placed.has(i.id));
    if (rest.length) list.push({ id: "more", title: t.more, items: rest });
    return list;
  }, [config.sections, byId, items, t.more]);

  const { total, count } = useMemo(() => {
    let sum = 0;
    let n = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const item = byId.get(id);
      if (!item) continue;
      sum += itemPrice(item) * qty;
      n += qty;
    }
    return { total: sum, count: n };
  }, [cart, byId]);

  const featured = useMemo(() => {
    const live = items.filter((i) => i.available);
    const pool = live.length ? live : items;
    const rentals = pool.filter((i) => i.kind === "rental");
    const ranked = (rentals.length ? rentals : pool).slice().sort((a, b) => itemPrice(b) - itemPrice(a));
    return ranked[0];
  }, [items]);

  const q = query.trim();
  const results = useMemo(() => (q ? items.filter((i) => matches(i, q)) : []), [items, q]);
  const shown = view === "home" || view === "all" ? sections : sections.filter((s) => s.id === view);
  const home = view === "home" && !q;

  const counted = (n: number) => (n === 1 ? t.countOne : fill(t.count, { n }));
  const ownerName = shop?.ownerFirstName ?? "";
  const orderHref = `/visit/order/${config.shopId}`;
  const hold = (e: React.MouseEvent) => {
    if (preview) e.preventDefault();
  };

  // Shops with short sections get a wider grid, so rows don't end in empty columns.
  const gridColumns = Math.max(...config.sections.map((s) => s.itemIds.length)) >= 4 ? 4 : 3;

  const featuredHref = featured
    ? featured.kind === "food"
      ? orderHref
      : `/visit/item/${featured.id}`
    : "/visit/agent";

  const promo = config.promo;
  const strip = promo ?? (config.bannerText ? { text: config.bannerText, percentOff: 0, tag: undefined } : undefined);

  const pick = (next: View) => {
    setView(next);
    setQuery("");
  };

  const { badges } = config;
  const badgeList = [
    badges.agentReady && { icon: <Bot />, text: t.agentReady },
    badges.permitVerified && { icon: <BadgeCheck />, text: t.permit },
    badges.bindingPartner && { icon: <ShieldCheck />, text: fill(t.binding, { partner: badges.bindingPartner }) },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const starts = shown.map((_, i) => shown.slice(0, i).reduce((sum, x) => sum + x.items.length, 0));

  return (
    <div
      className={`sf ${storefrontFontClass}`}
      data-mode={mode}
      data-device={device ?? "auto"}
      data-preset={config.theme.preset}
      lang={lang}
      style={themeVars(config.theme) as CSSProperties}
    >
      <div className="sf-shell">
        <header className="sf-top">
          <div className="sf-id">
            <span className="sf-avatar" aria-hidden>
              {initials(config.name)}
            </span>
            <span className="sf-name">{config.name}</span>
          </div>

          <label className="sf-search">
            <Search aria-hidden />
            <input
              type="text"
              role="searchbox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button type="button" aria-label={t.clear} onClick={() => setQuery("")}>
                <X />
              </button>
            )}
          </label>

          <div className="sf-top-end">
            {languages.length > 1 && (
              <div className="sf-lang" role="group" aria-label="Language">
                {languages.map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={l === lang}
                    className={l === lang ? "is-on" : undefined}
                    onClick={() => setPickedLang(l)}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
            <Link href={orderHref} className="sf-order" onClick={hold} aria-label={`${t.orderTotal} ${money(total)}`}>
              <span className="sf-order-text">
                <span className="sf-order-label">{t.orderTotal}</span>
                <span className="sf-order-value" key={total}>
                  {money(total)}
                </span>
              </span>
              <span className={`sf-round${count > 0 ? " is-on" : ""}`}>
                <ArrowRight />
              </span>
            </Link>
          </div>
        </header>

        <div className="sf-body">
          <nav className="sf-rail" aria-label={config.name}>
            <div className="sf-nav">
              <button type="button" className={view === "home" ? "is-on" : undefined} onClick={() => pick("home")}>
                <Store aria-hidden />
                {t.home}
              </button>
              <button type="button" className={view === "all" ? "is-on" : undefined} onClick={() => pick("all")}>
                <LayoutGrid aria-hidden />
                {t.all}
              </button>
            </div>
            {sections.length > 0 && <p className="sf-eyebrow">{t.categories}</p>}
            <div className="sf-nav sf-cats">
              {sections.map((s) => (
                <button key={s.id} type="button" className={view === s.id ? "is-on" : undefined} onClick={() => pick(s.id)}>
                  {s.title}
                </button>
              ))}
            </div>
            {badgeList.length > 0 && (
              <ul className="sf-badges">
                {badgeList.map((b) => (
                  <li key={b.text}>
                    {b.icon}
                    {b.text}
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <main className="sf-main">
            {home && (
              <>
                <div className="sf-greeting">
                  <h1>{fill(t.welcome, { name: config.name })}</h1>
                  <p>{config.tagline}</p>
                </div>

                {strip && (
                  <div className="sf-strip">
                    {strip.tag ? <span className="sf-strip-tag">{strip.tag}</span> : <Tag className="sf-strip-icon" aria-hidden />}
                    <span className="sf-strip-text">{strip.text}</span>
                    {strip.percentOff > 0 && <span className="sf-strip-off">{`-${strip.percentOff}%`}</span>}
                  </div>
                )}

                <div className="sf-panels">
                  <Link href="/visit/agent" className="sf-panel sf-panel-agent" onClick={hold}>
                    <Sparkles className="sf-panel-icon" aria-hidden />
                    <span className="sf-panel-title">{t.askAgent}</span>
                    <span className="sf-round">
                      <ArrowRight />
                    </span>
                  </Link>

                  {featured && (
                    <Link href={featuredHref} className="sf-panel sf-panel-featured" onClick={hold}>
                      <Image src={featured.photoUrl} alt="" width={800} height={600} unoptimized className="sf-panel-art" />
                      <span className="sf-panel-copy">
                        <span className="sf-panel-eyebrow">{t.featured}</span>
                        <span className="sf-panel-title">{featured.name}</span>
                      </span>
                      <span className="sf-round">
                        <ArrowRight />
                      </span>
                    </Link>
                  )}

                  <button
                    type="button"
                    className="sf-panel sf-panel-owner"
                    aria-expanded={ownerOpen}
                    onClick={() => setOwnerOpen((o) => !o)}
                  >
                    {config.heroPhotoUrl && (
                      <Image src={config.heroPhotoUrl} alt="" width={1600} height={640} unoptimized className="sf-panel-hero" />
                    )}
                    <span className="sf-panel-title">
                      {ownerName ? fill(t.meet, { owner: ownerName }) : config.name}
                    </span>
                    <span className={`sf-round${ownerOpen ? " is-open" : ""}`}>
                      <ArrowRight />
                    </span>
                  </button>
                </div>

                {ownerOpen && shop && (
                  <div className="sf-owner">
                    <span className="sf-owner-avatar" aria-hidden>
                      {ownerName.slice(0, 1)}
                    </span>
                    <div>
                      <p className="sf-owner-name">{ownerName}</p>
                      <p className="sf-owner-meta">
                        <span>{shop.neighborhood}</span>
                        <span>{fill(t.away, { km: shop.distanceKm })}</span>
                        <span className="sf-tnum">{shop.rating.toFixed(1)} / 5</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {q ? (
              <section className="sf-section" aria-label={t.results}>
                <div className="sf-sec-head">
                  <h2>{t.results}</h2>
                  <span>{counted(results.length)}</span>
                </div>
                {results.length > 0 ? (
                  <div className="sf-grid" data-cols={gridColumns}>
                    {results.map((item, i) => (
                      <ItemCard key={item.id} item={item} t={t} index={i} preview={preview} onAdd={addToOrder} />
                    ))}
                  </div>
                ) : (
                  <div className="sf-empty">
                    <p>{t.none}</p>
                    <button type="button" onClick={() => setQuery("")}>
                      {t.clear}
                    </button>
                  </div>
                )}
              </section>
            ) : (
              shown.map((s, si) => (
                <section key={s.id} className="sf-section" aria-labelledby={`sf-${config.shopId}-${s.id}`}>
                  <div className="sf-sec-head">
                    <h2 id={`sf-${config.shopId}-${s.id}`}>{s.title}</h2>
                    <span>{counted(s.items.length)}</span>
                  </div>
                  <div className="sf-grid" data-cols={gridColumns}>
                    {s.items.map((item, ii) => (
                      <ItemCard key={item.id} item={item} t={t} index={starts[si] + ii} preview={preview} onAdd={addToOrder} />
                    ))}
                  </div>
                </section>
              ))
            )}

            {badgeList.length > 0 && (
              <ul className="sf-badges sf-badges-foot">
                {badgeList.map((b) => (
                  <li key={b.text}>
                    {b.icon}
                    {b.text}
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>

        {!preview && (
          <div className="sf-dock">
            <div className="sf-dock-in">
              {count > 0 && (
                <Link href={orderHref} className="sf-dock-order">
                  <span>
                    {t.viewOrder}
                    <b className="sf-tnum">{` · ${count} · ${money(total)}`}</b>
                  </span>
                  <ArrowRight />
                </Link>
              )}
              <Link href="/visit/agent" className="sf-ask">
                <Sparkles aria-hidden />
                <span>{t.askAgent}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
