"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, ReceiptText, Star } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemSummary } from "@/components/shared/ItemSummary";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { buttonVariants } from "@/components/ui/button";
import { money, orderNumber } from "@/lib/format";
import { useItem, useShop } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PhoneSkeleton } from "./Parts";
import { useRc } from "./RentalCopy";
import { feeOf, useRental } from "./terms";

function Rating({ owner }: { owner: string }) {
  const { t } = useRc();
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center justify-between gap-3 pl-1">
      <p className="text-[17px] font-semibold" aria-live="polite">
        {value > 0 ? t("thanks") : t("rate", { owner })}
      </p>
      <div
        className="flex"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label={t("rate", { owner })}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t("stars", { n })}
            onMouseEnter={() => setHover(n)}
            onClick={() => setValue(n)}
            className="flex size-10 items-center justify-center rounded-lg outline-none transition-transform duration-150 focus-visible:ring-3 focus-visible:ring-primary/15 active:scale-90"
          >
            <Star
              className={cn(
                "size-7 transition-colors duration-150",
                n <= shown ? "fill-warning text-warning" : "text-border",
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Line({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <p className="text-[17px]">
        {label}
        {hint && <span className="text-muted-foreground"> · {hint}</span>}
      </p>
      <p className="shrink-0 text-[17px] font-semibold tabular-nums">{children}</p>
    </div>
  );
}

export function ReceiptView({ id }: { id: string }) {
  const { hydrated, rental } = useRental(id);
  const item = useItem(rental?.itemId);
  const shop = useShop(rental?.shopId);
  const rc = useRc();
  const { t } = rc;

  if (!hydrated) return <PhoneSkeleton />;

  if (!rental || rental.status !== "settled") {
    return (
      <div className="flex min-h-full flex-col">
        <ScreenHeader title={t("receipt")} backHref={rental ? `/visit/rentals/${rental.id}` : "/visit/trips"} />
        <EmptyState
          icon={<ReceiptText />}
          title={t("noReceipt")}
          description={rental ? t("noReceiptBody") : t("noRental")}
          action={
            <Link
              href={rental ? `/visit/rentals/${rental.id}` : "/visit/trips"}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {rental ? t("backRental") : t("backTrips")}
            </Link>
          }
          className="my-auto"
        />
      </div>
    );
  }

  const fee = feeOf(rental);
  const charged = rental.capturedCents ?? fee;
  const released = rental.releasedCents ?? rental.holdCents - charged;
  const damage = Math.max(0, charged - fee);
  const owner = shop?.ownerFirstName || shop?.name || t("owner");

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title={t("receipt")} backHref={`/visit/rentals/${rental.id}`} />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-3">
        {item && (
          <ItemSummary
            item={item}
            lines={[[shop?.ownerFirstName, shop?.neighborhood].filter(Boolean).join(" · ") || shop?.name || owner, rc.range(rental.pickupAt, rental.returnBy)]}
          />
        )}
        <div className="h-px bg-border" aria-hidden />

        <section className="animate-rise">
          <h2 className="text-[20px] font-bold tracking-[-0.018em]">{t("charged")}</h2>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[40px] leading-none font-bold tracking-tight tabular-nums">{money(charged)}</p>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-muted px-3 text-[15px] tabular-nums">
              {t("holdReleased", { amount: money(released) })}
            </span>
          </div>
          <p className="mt-2 font-mono text-[13px] text-muted-foreground">{orderNumber(rental.id)}</p>
        </section>

        <div className="animate-rise divide-y divide-border/70 rounded-xl bg-muted/60 [animation-delay:60ms]">
          <Line label={t("rentalFee")} hint={`${rental.days} × ${money(rental.dailyFeeCents)}`}>
            {money(fee)}
          </Line>
          {damage > 0 && (
            <Line label={t("damage")} hint={rental.damageNote ?? t("fromDeposit")}>
              {money(damage)}
            </Line>
          )}
          <Line label={t("depositReleased")}>{money(released)}</Line>
        </div>

        <div className="flex animate-rise items-center gap-3 px-1 text-[15px] text-muted-foreground [animation-delay:120ms]">
          <CreditCard className="size-5" strokeWidth={1.75} />
          {t("card")}
        </div>

        <Rating owner={owner} />
      </div>

      <div className="sticky bottom-0 mt-auto bg-card px-4 pt-2 pb-4">
        <Link
          href="/visit/home"
          className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
