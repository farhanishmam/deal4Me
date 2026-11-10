"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/components/visitor/i18n";
import { money } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import { useStore } from "@/lib/store";
import type { AgentCard } from "@/lib/types";
import { agentStrings } from "./strings";
import { AvailabilitySummary } from "@/components/visitor/item/AvailabilitySummary";

/** One result inside a reply: a light row with the photo, name and price, then the action. */
export function AgentResultCard({ card, first }: { card: AgentCard; first: boolean }) {
  const { lang } = useT();
  const s = agentStrings(lang);
  const item = useStore((st) => st.items.find((i) => i.id === card.itemId));
  const art = item ? thumbFor(item) : "/brand/no-photo.svg";
  const rental = card.kind === "rental";

  // The server decides where each action goes, including the number of days.
  const primary = card.actions[0];
  const secondary = card.actions[1];
  const detailAction = card.actions.find((action) => action.href.startsWith("/visit/item/"));
  const primaryHref = rental && card.itemId ? detailAction?.href ?? `/visit/item/${card.itemId}` : primary?.href ?? (card.itemId ? `/visit/item/${card.itemId}` : "#");
  const primaryLabel = rental ? lang === "ja" ? "日時とサイズを選ぶ" : "Dates & size" : card.kind === "food" ? s.order : s.details;

  return (
    <div className="animate-rise rounded-xl bg-muted/60 p-3">
      <div className="flex gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art} alt="" draggable={false} className="size-full object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3 className="truncate text-[17px] leading-tight font-bold tracking-[-0.01em]">{card.title}</h3>
          {rental && item?.rental ? (
            <>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                {money(item.rental.dailyFeeCents)}
                {s.perDay}
              </p>
              <p className="truncate text-[13px] text-muted-foreground tabular-nums">
                {s.deposit(money(item.rental.depositCents))}
              </p>
            </>
          ) : (
            <>
              {card.subtitle && <p className="truncate text-[13px] text-muted-foreground">{card.subtitle}</p>}
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{card.priceLabel}</p>
            </>
          )}
        </div>
      </div>
      {item && item.kind !== "food" && <AvailabilitySummary item={item} lang={lang} compact />}
      <div className="mt-2 flex gap-2">
        <Link
          href={primaryHref}
          className={buttonVariants({
            variant: first ? "default" : "outline",
            className: first ? "h-11 flex-1 rounded-xl text-[15px] font-semibold" : "h-11 flex-1 rounded-xl border-transparent bg-card text-[15px] font-semibold hover:bg-card/70",
          })}
        >
          {primaryLabel}
        </Link>
        {rental && secondary && (
          <Link
            href={secondary.href}
            className={buttonVariants({
              variant: "outline",
              className: "h-11 rounded-xl border-transparent bg-card px-5 text-[15px] font-semibold hover:bg-card/70",
            })}
          >
            {s.view}
          </Link>
        )}
      </div>
    </div>
  );
}
