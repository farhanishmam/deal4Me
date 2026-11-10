import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/StatusPill";
import { shortDate } from "@/lib/format";
import type { Shop } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StorefrontCard({ shop }: { shop: Shop }) {
  const live = Boolean(shop.liveAt);
  return (
    <div className="flex flex-1 flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{shop.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {`/s/${shop.slug}`}
          </p>
        </div>
        <StatusPill tone={live ? "success" : "neutral"} dot>
          {live ? `Live since ${shortDate(shop.liveAt!)}` : "Not live"}
        </StatusPill>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/sell/studio/${shop.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-11 sm:h-8",
          )}
        >
          Open studio
        </Link>
        <Link
          href={`/s/${shop.slug}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-11 sm:h-8",
          )}
        >
          View public page
          <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}
