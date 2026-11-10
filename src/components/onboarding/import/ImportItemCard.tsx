import { money } from "@/lib/format";
import { Package } from "lucide-react";
import type { Item } from "@/lib/types";

/** A read-only item card that arrives while the import runs. */
export function ImportItemCard({ item }: { item: Item }) {
  return (
    <li className="flex animate-rise items-center gap-3 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-md">
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photoUrl} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover ring-1 ring-border" />
      ) : <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Package className="size-5" /></span>}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{item.category}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{money(item.priceCents ?? item.rental?.dailyFeeCents ?? 0)}</span>
    </li>
  );
}
