"use client";

import Link from "next/link";
import { ChevronRight, Ticket } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import type { PillTone } from "@/components/shared/StatusPill";
import { buttonVariants } from "@/components/ui/button";
import { clockTime, money, orderNumber } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import { useHydrated, useStore } from "@/lib/store";
import type { FoodOrder, Item, ItemRequest, Rental } from "@/lib/types";
import { formatRange } from "../i18n";
import { useC } from "./copy";
import type { CopyKey } from "./copy";

const RENTAL_TONE: Record<Rental["status"], PillTone> = {
  reserved: "info",
  picked_up: "success",
  returned: "neutral",
  settled: "neutral",
};
const ORDER_TONE: Record<FoodOrder["status"], PillTone> = {
  placed: "info",
  accepted: "info",
  ready: "success",
  picked_up: "neutral",
};

const ROW =
  "flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15";

function Thumb({ item }: { item?: Pick<Item, "id" | "photoUrl"> }) {
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-card">
      {item?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbFor(item)} alt="" draggable={false} className="size-full object-cover" />
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex animate-rise flex-col gap-2">
      <h2 className="px-1 text-[13px] font-semibold text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function RentalRow({ rental }: { rental: Rental }) {
  const { lang, c } = useC();
  const item = useStore((s) => s.items.find((i) => i.id === rental.itemId));
  const dates = formatRange(lang, rental.pickupAt, rental.returnBy);
  return (
    <li>
      <Link href={`/visit/rentals/${rental.id}`} className={`${ROW} hover:bg-muted`}>
        <Thumb item={item} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <p className="w-full truncate text-[17px] leading-tight font-semibold">{item?.name || c("trips.rental")}</p>
          {dates && <p className="w-full truncate text-[13px] text-muted-foreground tabular-nums">{dates}</p>}
          <StatusPill tone={RENTAL_TONE[rental.status]} dot>
            {c(`status.${rental.status}` as CopyKey)}
          </StatusPill>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function OrderRow({ order }: { order: FoodOrder }) {
  const { c } = useC();
  const items = useStore((s) => s.items);
  const shop = useStore((s) => s.shops.find((x) => x.id === order.shopId));
  const first = items.find((i) => i.id === order.lines[0]?.itemId);
  const count = order.lines.reduce((n, l) => n + l.qty, 0);
  const pickup = order.pickupTime ? clockTime(order.pickupTime) : "";
  return (
    <li className={ROW}>
      <Thumb item={first} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="w-full truncate text-[17px] leading-tight font-semibold">{shop?.name || c("trips.orders")}</p>
        <p className="w-full truncate text-[13px] text-muted-foreground tabular-nums">
          {[orderNumber(order.id), count === 1 ? c("trips.item") : c("trips.items", { n: count }), pickup]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <StatusPill tone={ORDER_TONE[order.status]} dot>
          {c(`status.${order.status}` as CopyKey)}
        </StatusPill>
      </div>
      <span className="shrink-0 self-start pt-0.5 text-[17px] font-semibold tabular-nums">{money(order.totalCents)}</span>
    </li>
  );
}

function RequestRow({ request }: { request: ItemRequest }) {
  const item = useStore((state) => state.items.find((entry) => entry.id === request.itemId));
  const { lang } = useC();
  const dates = request.startsAt ? formatRange(lang, request.startsAt, request.endsAt ?? request.startsAt) : "";
  return <li><Link href={`/visit/item/${request.itemId}`} className={`${ROW} hover:bg-muted`}><Thumb item={item} /><div className="min-w-0 flex-1 space-y-1"><p className="truncate text-[17px] font-semibold">{item?.name ?? "Item request"}</p><p className="text-[13px] text-muted-foreground">{[dates, request.size ? `Size ${request.size.replace(/^size\s*/i, "")}` : "", request.agreedPriceCents !== undefined ? `Agreed ${money(request.agreedPriceCents)}${request.kind === "rental" ? " / day" : ""}` : ""].filter(Boolean).join(" · ")}</p>{request.status === "confirmed" ? <StatusPill tone="success" dot>Confirmed by seller</StatusPill> : <StatusPill tone="info" dot>Awaiting seller confirmation</StatusPill>}</div><ChevronRight className="size-5 shrink-0 text-muted-foreground" /></Link></li>;
}

export function Trips() {
  const { c } = useC();
  const hydrated = useHydrated();
  const rentals = useStore((s) => s.rentals);
  const orders = useStore((s) => s.orders);
  const requests = useStore((s) => s.itemRequests);
  const empty = rentals.length === 0 && orders.length === 0 && requests.length === 0;

  return (
    <div className="flex min-h-full flex-col bg-card">
      <ScreenHeader title={c("trips.title")} backHref="/visit/profile" />
      <div className="flex flex-1 flex-col gap-6 px-4 pt-3 pb-6">
        {!hydrated ? (
          <p className="pt-16 text-center text-[15px] text-muted-foreground">{c("trips.loading")}</p>
        ) : empty ? (
          <EmptyState
            icon={<Ticket />}
            title={c("trips.emptyTitle")}
            description={c("trips.emptyBody")}
            action={
              <Link href="/visit/home" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {c("trips.browse")}
              </Link>
            }
            className="animate-rise"
          />
        ) : (
          <>
            {requests.length > 0 && <Section title="Your requests">{requests.map((request) => <RequestRow key={request.id} request={request} />)}</Section>}
            {rentals.length > 0 && (
              <Section title={c("trips.rentals")}>
                {rentals.map((r) => (
                  <RentalRow key={r.id} rental={r} />
                ))}
              </Section>
            )}
            {orders.length > 0 && (
              <Section title={c("trips.orders")}>
                {orders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
