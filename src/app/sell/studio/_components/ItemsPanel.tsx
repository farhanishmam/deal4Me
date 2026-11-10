"use client";

import { ArrowDown, ArrowUp, ChevronRight, PackageOpen } from "lucide-react";
import Image from "next/image";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusPill } from "@/components/shared/StatusPill";
import { money, perDay } from "@/lib/format";
import { getShop, useShop, useStore } from "@/lib/store";
import type { Item, StorefrontSection } from "@/lib/types";

function priceLabel(item: Item): string {
  if (item.kind === "rental") return item.rental ? perDay(item.rental.dailyFeeCents) : "";
  return item.priceCents !== undefined ? money(item.priceCents) : "";
}

function MoveButtons({
  label,
  index,
  count,
  onMove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
}) {
  const cls =
    "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(-1)} className={cls}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(1)} className={cls}>
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}

function swap<T>(list: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  [copy[from], copy[to]] = [copy[to], copy[from]];
  return copy;
}

export function ItemsPanel({
  shopId,
  items,
  onOpen,
}: {
  shopId: string;
  items: Item[];
  onOpen: (id: string) => void;
}) {
  const shop = useShop(shopId);
  if (!shop) return null;
  const byId = new Map(items.map((i) => [i.id, i]));
  const sections = shop.storefront.sections;

  const save = (next: StorefrontSection[]) => {
    const current = getShop(shopId);
    if (!current) return;
    useStore.getState().upsertShop({ ...current, storefront: { ...current.storefront, sections: next } });
  };
  const moveItem = (si: number, ii: number, dir: -1 | 1) =>
    save(sections.map((s, i) => (i === si ? { ...s, itemIds: swap(s.itemIds, ii, dir) } : s)));
  const moveSection = (si: number, dir: -1 | 1) => save(swap(sections, si, dir));

  const placed = new Set(sections.flatMap((s) => s.itemIds));
  const loose = items.filter((i) => !placed.has(i.id));

  if (items.length === 0) {
    return <EmptyState compact icon={<PackageOpen />} title="No items yet" description="Add items from the dashboard." />;
  }

  const row = (item: Item, controls?: React.ReactNode) => (
    <li key={item.id} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <Image
          src={item.photoUrl}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-10 shrink-0 rounded-lg bg-muted object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{item.name}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">{priceLabel(item)}</span>
        </span>
        {!item.available && <StatusPill tone="neutral">Hidden</StatusPill>}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
      {controls}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      {sections.map((s, si) => {
        const own = s.itemIds.map((id) => byId.get(id)).filter((i): i is Item => !!i);
        if (own.length === 0) return null;
        return (
          <section key={s.id} aria-label={s.title}>
            <div className="mb-1 flex items-center justify-between pl-2">
              <h3 className="text-label font-semibold text-muted-foreground">{s.title}</h3>
              {sections.length > 1 && (
                <MoveButtons label={`${s.title} section`} index={si} count={sections.length} onMove={(d) => moveSection(si, d)} />
              )}
            </div>
            <ul className="flex flex-col">
              {own.map((item) => {
                const ii = s.itemIds.indexOf(item.id);
                return row(
                  item,
                  <MoveButtons label={item.name} index={ii} count={s.itemIds.length} onMove={(d) => moveItem(si, ii, d)} />
                );
              })}
            </ul>
          </section>
        );
      })}
      {loose.length > 0 && (
        <section aria-label="More">
          <h3 className="mb-1 pl-2 text-label font-semibold text-muted-foreground">More</h3>
          <ul className="flex flex-col">{loose.map((i) => row(i))}</ul>
        </section>
      )}
    </div>
  );
}
