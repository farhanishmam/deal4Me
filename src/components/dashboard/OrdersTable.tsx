"use client";

import { Button } from "@/components/ui/button";
import { StatusPill, type PillTone } from "@/components/shared/StatusPill";
import { money, orderNumber } from "@/lib/format";
import type { FoodOrder, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = FoodOrder["status"];

const STATUS: Record<Status, { label: string; tone: PillTone }> = {
  placed: { label: "New", tone: "neutral" },
  accepted: { label: "Preparing", tone: "info" },
  ready: { label: "Ready", tone: "warning" },
  picked_up: { label: "Picked up", tone: "success" },
};

/** What the quiet inline action says, where it moves the order, and what the step log records. */
export const NEXT: Partial<
  Record<Status, { action: string; next: Status; log: string }>
> = {
  placed: { action: "Accept", next: "accepted", log: "Order accepted" },
  accepted: { action: "Mark ready", next: "ready", log: "Order ready" },
  ready: { action: "Picked up", next: "picked_up", log: "Order picked up" },
};

// Phones stack each order into three short lines; from sm up it is one row of five columns.
const ROW =
  "grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[132px_minmax(0,1fr)_104px_72px_108px] sm:gap-y-0";

export function OrdersTable({
  orders,
  shops,
  onAdvance,
}: {
  orders: FoodOrder[];
  shops: Shop[];
  onAdvance: (order: FoodOrder) => void;
}) {
  if (orders.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">No orders match.</p>
    );
  }

  return (
    <div role="table" aria-label="Recent orders">
      <div
        role="row"
        // Plain string on purpose: cn() drops the custom text-label size next to a text color.
        className={`${ROW} hidden border-b border-border pb-3 text-label text-muted-foreground sm:grid`}
      >
        <span role="columnheader">Order</span>
        <span role="columnheader">Shop</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="text-right">
          Total
        </span>
        <span role="columnheader" className="sr-only">
          Action
        </span>
      </div>
      <div role="rowgroup">
        {orders.map((order) => {
          const status = STATUS[order.status];
          const step = NEXT[order.status];
          const shop = shops.find((s) => s.id === order.shopId);
          return (
            <div
              key={order.id}
              role="row"
              className={cn(
                ROW,
                "grid border-b border-border py-3.5 last:border-b-0 last:pb-0 sm:min-h-[56px] sm:py-2",
              )}
            >
              <span
                role="cell"
                className="col-span-2 row-start-2 font-mono text-xs text-muted-foreground sm:col-span-1 sm:row-start-auto sm:text-[13px] sm:text-foreground"
              >
                {orderNumber(order.id)}
              </span>
              <span
                role="cell"
                className="col-start-1 row-start-1 truncate text-sm font-semibold sm:col-auto sm:row-auto sm:font-normal"
              >
                {shop?.name ?? order.shopId}
              </span>
              <span
                role="cell"
                className="col-start-1 row-start-3 mt-1.5 sm:col-auto sm:row-auto sm:mt-0"
              >
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </span>
              <span
                role="cell"
                className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-auto sm:row-auto sm:font-normal"
              >
                {money(order.totalCents)}
              </span>
              <span
                role="cell"
                className="col-start-2 row-start-3 mt-1.5 flex justify-end sm:col-auto sm:row-auto sm:mt-0"
              >
                {step && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 sm:h-8"
                    onClick={() => onAdvance(order)}
                  >
                    {step.action}
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
