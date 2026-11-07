"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { money } from "@/lib/format";
import type { Item, Shop } from "@/lib/types";
import { useT } from "./i18n";

function Meta({ shop, lead }: { shop: Shop; lead: string }) {
  const { t } = useT();
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground tabular-nums">
      <span className="truncate">{lead}</span>
      <span aria-hidden>·</span>
      <span className="flex shrink-0 items-center gap-0.5 text-foreground">
        <Star className="size-3 fill-current" aria-hidden />
        {shop.rating.toFixed(1)}
      </span>
      <span aria-hidden>·</span>
      <span className="shrink-0">{t("home.km", { n: shop.distanceKm })}</span>
    </p>
  );
}

/** A rental from a local. Shows the daily fee and the deposit hold, never the owner's floor price. */
export function GearCard({ item, shop }: { item: Item; shop: Shop }) {
  const { t } = useT();
  const rental = item.rental;
  if (!rental) return null;
  return (
    <Link
      href={`/visit/item/${item.id}`}
      className="group block w-[224px] shrink-0 snap-start rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-150 group-hover:shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.photoUrl} alt="" draggable={false} className="size-full object-cover" />
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="truncate text-[15px] font-semibold">{item.name}</h3>
        <Meta shop={shop} lead={shop.ownerFirstName} />
        <p className="mt-1.5 text-[13px] text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">
            {t("home.perDay", { price: money(rental.dailyFeeCents) })}
          </span>
          {" · "}
          {t("home.depositHeld", { deposit: money(rental.depositCents) })}
        </p>
      </div>
    </Link>
  );
}

/** A food shop, using its hero art. */
export function EatCard({ shop }: { shop: Shop }) {
  const hero = shop.storefront.heroPhotoUrl ?? `/demo/heroes/${shop.id}.svg`;
  return (
    <Link
      href={`/s/${shop.slug}`}
      className="group block w-[264px] shrink-0 snap-start rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
    >
      <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-150 group-hover:shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt="" draggable={false} className="size-full object-cover" />
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="truncate text-[15px] font-semibold">{shop.name}</h3>
        <Meta shop={shop} lead={shop.neighborhood} />
      </div>
    </Link>
  );
}
