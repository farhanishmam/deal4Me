import { money, perDay } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import type { Item, Negotiation } from "@/lib/types";

export function DealsCard({
  negotiations,
  items,
}: {
  negotiations: Negotiation[];
  items: Item[];
}) {
  const deals = negotiations
    .filter((n) => n.status === "deal" && n.agreedDailyCents !== undefined)
    .slice(0, 3);

  if (deals.length === 0) {
    return <p className="text-sm text-muted-foreground">No deals yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {deals.map((deal) => {
        const item = items.find((i) => i.id === deal.itemId);
        const agreed = deal.agreedDailyCents ?? deal.askingCents;
        const sale = deal.kind === "sale";
        const saved = Math.max(0, deal.askingCents - agreed) * (sale ? 1 : deal.days);
        return (
          <li key={deal.id} className="flex items-center gap-3">
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
              <p className="truncate text-sm font-semibold">
                {item?.name ?? (sale ? "Purchase" : "Rental")}
              </p>
              <p className="text-label text-muted-foreground tabular-nums">
                {sale ? "Purchase" : `${deal.days} ${deal.days === 1 ? "day" : "days"}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {sale ? money(agreed) : perDay(agreed)}
              </p>
              {saved > 0 && (
                <p className="text-label font-semibold text-success tabular-nums">
                  Saved {money(saved)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
