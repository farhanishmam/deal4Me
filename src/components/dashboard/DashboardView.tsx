"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duration, money, orderNumber } from "@/lib/format";
import { useSellerShop } from "@/lib/seller";
import { useStore } from "@/lib/store";
import type { FoodOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveRentals } from "./ActiveRentals";
import { Card, CardHeader } from "./Card";
import { DealsCard } from "./DealsCard";
import { buildSeries, weekStats } from "./earnings";
import { EarningsChart } from "./EarningsChart";
import { useMinuteClock } from "./hooks";
import { KpiTile } from "./KpiTile";
import { NEXT, OrdersTable } from "./OrdersTable";
import { StorefrontCard } from "./StorefrontCard";

const STAGGER = (n: number) => ({ animationDelay: `${n * 60}ms` });

export function DashboardView() {
  const { hydrated, shop: maya, items } = useSellerShop();
  const allOrders = useStore((s) => s.orders);
  const allRentals = useStore((s) => s.rentals);
  const shops = useStore((s) => s.shops);
  const allNegotiations = useStore((s) => s.negotiations);
  const upsertOrder = useStore((s) => s.upsertOrder);
  const logStep = useStore((s) => s.logStep);
  const shopId = maya?.id;
  const orders = useMemo(() => allOrders.filter((o) => o.shopId === shopId), [allOrders, shopId]);
  const rentals = useMemo(() => allRentals.filter((r) => r.shopId === shopId), [allRentals, shopId]);
  const negotiations = useMemo(() => {
    const ids = new Set(items.map((i) => i.id));
    return allNegotiations.filter((n) => ids.has(n.itemId));
  }, [allNegotiations, items]);
  const [query, setQuery] = useState("");
  const now = useMinuteClock();

  const activeRentals = useMemo(
    () =>
      rentals.filter(
        (r) => r.status === "reserved" || r.status === "picked_up",
      ),
    [rentals],
  );

  // Only collected money counts: picked-up orders and returned rentals.
  const series = useMemo(() => buildSeries(orders, rentals, now), [orders, rentals, now]);
  const week = weekStats(series);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const shopName = shops.find((s) => s.id === o.shopId)?.name ?? "";
      return `${orderNumber(o.id)} ${shopName}`.toLowerCase().includes(q);
    });
  }, [orders, shops, query]);

  function advance(order: FoodOrder) {
    const step = NEXT[order.status];
    if (!step) return;
    upsertOrder({ ...order, status: step.next });
    const shopName =
      shops.find((s) => s.id === order.shopId)?.name ?? order.shopId;
    logStep({
      actor: "Storefront agent",
      action: step.log,
      detail: `${shopName}, ${orderNumber(order.id)}`,
    });
  }

  const owner = maya?.ownerFirstName?.trim();

  if (!maya) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-title">Dashboard</h1>
        {hydrated && (
          <div className="flex max-w-md flex-col items-start gap-4 rounded-xl bg-muted/60 p-6">
            <p className="text-sm text-muted-foreground">
              You have no store yet. Add your items to start selling.
            </p>
            <Link href="/sell/start" className={cn(buttonVariants(), "h-11")}>
              Start selling
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex animate-rise flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label text-muted-foreground">{owner ? `Welcome back, ${owner}` : "Welcome back"}</p>
          <h1 className="text-title">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:w-[300px] sm:flex-none">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders"
              aria-label="Search orders"
              className="h-11 pl-9 sm:h-10"
            />
          </div>
          <Link
            href="/seller/scan"
            className={cn(buttonVariants(), "h-11 sm:h-10")}
          >
            <Plus data-icon="inline-start" />
            Add items
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Orders"
          value={String(orders.length)}
          style={STAGGER(1)}
        />
        <KpiTile
          label="Active rentals"
          value={String(activeRentals.length)}
          style={STAGGER(2)}
        />
        <KpiTile
          label="Earnings this week"
          value={money(week.thisWeek)}
          delta={week.deltaPct > 0 ? `+${week.deltaPct}%` : undefined}
          style={STAGGER(3)}
        />
        <KpiTile
          label="Time to go live"
          value={
            maya?.onboardingSeconds ? duration(maya.onboardingSeconds) : "–"
          }
          style={STAGGER(4)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" style={STAGGER(5)}>
          <CardHeader
            title="Earnings"
            aside={
              <span className="text-label text-muted-foreground">
                Last 30 days
              </span>
            }
          />
          <EarningsChart points={series} />
        </Card>
        <Card style={STAGGER(6)}>
          <CardHeader title="Active rentals" />
          <ActiveRentals rentals={activeRentals} items={items} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" style={STAGGER(7)}>
          <CardHeader title="Recent orders" />
          <OrdersTable orders={shown} shops={shops} onAdvance={advance} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex-1" style={STAGGER(8)}>
            <CardHeader title="Negotiations" />
            <DealsCard negotiations={negotiations} items={items} />
          </Card>
          <Card className="flex-1" style={STAGGER(9)}>
            <CardHeader title="Storefront" />
            <StorefrontCard shop={maya} />
          </Card>
        </div>
      </div>
    </div>
  );
}
