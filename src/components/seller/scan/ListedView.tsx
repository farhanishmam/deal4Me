"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/format";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListedView({ item, onAgain }: { item: Item; onAgain: () => void }) {
  const cents = item.kind === "rental" ? item.rental?.dailyFeeCents : item.priceCents;
  const price = cents === undefined ? "" : `${money(cents)}${item.kind === "rental" ? " / day" : ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card px-4">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="animate-pop flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-7" strokeWidth={2.25} />
        </span>
        <h1 className="animate-rise mt-5 text-[28px] leading-tight font-bold tracking-[-0.02em]">Listed</h1>
        <p className="animate-rise mt-2 max-w-[280px] text-[15px] text-muted-foreground">
          {item.name}
          {price ? <span className="tabular-nums">{`, ${price}`}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 pb-3">
        <Link href={`/visit/item/${item.id}`} className={cn(buttonVariants(), "h-12 w-full rounded-xl text-[17px] font-semibold")}>
          See it as a buyer
        </Link>
        <Link href="/seller/listings" className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}>
          View listings
        </Link>
        <Button type="button" variant="ghost" onClick={onAgain} className="h-11 w-full rounded-xl text-[15px] font-semibold">
          Scan another
        </Button>
      </div>
    </div>
  );
}
