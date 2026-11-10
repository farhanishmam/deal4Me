"use client";

import Link from "next/link";
import { money, shortDate } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import type { Item, Rental } from "@/lib/types";
import { useMinuteClock } from "./hooks";

function usedShare(rental: Rental, now: number): number {
  const start = Date.parse(rental.pickupAt);
  const end = Date.parse(rental.returnBy);
  if (!now || !(end > start)) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function ActiveRentals({
  rentals,
  items,
}: {
  rentals: Rental[];
  items: Item[];
}) {
  const now = useMinuteClock();

  if (rentals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing out on rent.</p>
    );
  }

  const held = rentals.reduce((sum, r) => sum + r.holdCents, 0);

  return (
    <div className="flex flex-1 flex-col">
      <ul className="-mx-2 flex flex-col">
        {rentals.map((rental) => {
          const item = items.find((i) => i.id === rental.itemId);
          const share = usedShare(rental, now);
          return (
            <li key={rental.id}>
              <Link
                href={`/sell/rentals/${rental.id}`}
                className="block rounded-lg p-2 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
              >
                <div className="flex items-center gap-3">
                  {item ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbFor(item)}
                      alt=""
                      className="size-11 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <span className="size-11 shrink-0 rounded-lg bg-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold">
                        {item?.name ?? "Rental"}
                      </p>
                      <p className="shrink-0 text-label text-muted-foreground tabular-nums">
                        Due {shortDate(rental.returnBy)}
                      </p>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Rental time used"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(share * 100)}
                      className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-soft"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto border-t border-border pt-4 text-label text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {money(held)}
        </span>{" "}
        held, not charged
      </p>
    </div>
  );
}
