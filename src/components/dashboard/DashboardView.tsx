"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duration, money, orderNumber } from "@/lib/format";
import { useShop, useStore } from "@/lib/store";
import type { FoodOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveRentals } from "./ActiveRentals";
import { Card, CardHeader } from "./Card";
import { DealsCard } from "./DealsCard";
import { buildSeries, weekStats } from "./demo-series";
import { EarningsChart } from "./EarningsChart";
import { useMinuteClock } from "./hooks";
import { KpiTile } from "./KpiTile";
import { NEXT, OrdersTable } from "./OrdersTable";
import { StorefrontCard } from "./StorefrontCard";

const STAGGER = (n: number) => ({ animationDelay: `${n * 60}ms` });

export function DashboardView() {
  const orders = useStore((s) => s.orders);
  const rentals = useStore((s) => s.rentals);
  const items = useStore((s) => s.items);
  const shops = useStore((s) => s.shops);
  const negotiations = useStore((s) => s.negotiations);
  const upsertOrder = useStore((s) => s.upsertOrder);
  const logStep = useStore((s) => s.logStep);
  const maya = useShop("mayas-gear");
  const [query, setQuery] = useState("");
  const now = useMinuteClock();

  const activeRentals = useMemo(
    () =>
      rentals.filter(
        (r) => r.status === "reserved" || r.status === "picked_up",
      ),
    [rentals],
  );

  // Orders that are picked up count toward today's earnings, so the chart and tile move with the table.
  const series = useMemo(() => {
    const collected = orders
      .filter((o) => o.status === "picked_up")
      .reduce((sum, o) => sum + o.totalCents, 0);
    return buildSeries(collected, now);
  }, [orders, now]);
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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex animate-rise flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label text-muted-foreground">Welcome back, Maya</p>
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
            href="/sell/start"
            className={cn(buttonVariants(), "h-11 sm:h-10")}
          >
            <Plus data-icon="inline-start" />
            Add items
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Orders today"
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

      <div className="grid gap-4 lg:grid-cols-3">
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

      <div className="grid gap-4 lg:grid-cols-3">
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
