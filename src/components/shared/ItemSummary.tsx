/* eslint-disable @next/next/no-img-element */
import { thumbFor } from "@/lib/photos";
import type { Item } from "@/lib/types";

/** Photo, short item name and two detail lines, used at the top of the deal screens. */
export function ItemSummary({
  item,
  lines,
}: {
  item: Pick<Item, "id" | "name" | "photoUrl">;
  lines: string[];
}) {
  return (
    <div className="flex items-center gap-4">
      <img
        src={thumbFor(item)}
        alt=""
        className="h-[72px] w-[108px] shrink-0 rounded-xl bg-muted object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-[17px] font-bold tracking-[-0.012em]">{item.name.split(",")[0]}</p>
        {lines.map((line) => (
          <p key={line} className="truncate text-[15px] leading-[1.45] text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
