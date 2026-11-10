"use client";

import { useMemo, useState } from "react";
import { useMinuteClock } from "@/components/dashboard/hooks";
import Link from "next/link";
import { PackageSearch, Star, Wrench } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemPhotoGallery } from "@/components/shared/ItemPhotoGallery";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_TIME_ZONE, conditionLabel, money, zonedIso } from "@/lib/format";
import { useItem, useShop } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LOCALES, useC } from "./copy";
import { AvailabilitySummary } from "./AvailabilitySummary";
import { ItemRequestSheet } from "./ItemRequestSheet";

const STRIP = 7;
const MAIN = "h-12 w-full rounded-xl text-[17px] font-semibold";

export function ItemDetail({ id, initialDays = 3, initialRequest, negotiationId, openRequest = false }: { id: string; initialDays?: number; initialRequest?: { startsAt?: string; endsAt?: string; size?: string }; negotiationId?: string; openRequest?: boolean }) {
  const { lang, c } = useC();
  const item = useItem(id);
  const shop = useShop(item?.shopId);
  const [days, setDays] = useState(initialDays);
  const [requestOpen, setRequestOpen] = useState(openRequest);
  const now = useMinuteClock();

  const strip = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALES[lang], { timeZone: APP_TIME_ZONE, weekday: "short" });
    const num = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, day: "numeric" });
    return Array.from({ length: STRIP }, (_, i) => {
      const d = new Date(zonedIso(i + 1, 12));
      return { weekday: fmt.format(d), day: num.format(d) };
    });
  }, [lang]);

  if (!item || !shop) {
    return (
      <div className="flex min-h-full flex-col bg-card">
        <ScreenHeader title="" backHref="/visit/home" />
        <EmptyState
          icon={<PackageSearch />}
          title={c("missingTitle")}
          description={c("missingBody")}
          action={
            <Link href="/visit/home" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {c("home")}
            </Link>
          }
          className="flex-1 animate-rise"
        />
      </div>
    );
  }

  const rental = item.kind === "rental" ? item.rental : undefined;
  const maxDays = Math.min(rental?.maxDays ?? STRIP, STRIP);
  const n = Math.min(days, maxDays);
  const shopFirst = shop.ownerFirstName || shop.name;
  const shortName = item.name.split(",")[0];
  const available = item.available && (!item.availableUntil || !now || now <= Date.parse(item.availableUntil));

  if (requestOpen && (rental || item.kind === "sale")) {
    return <ItemRequestSheet key={`request-${item.id}`} item={item} onClose={() => setRequestOpen(false)} defaultDays={n} initialRequest={initialRequest} negotiationId={negotiationId} />;
  }

  return (
    <div className="flex min-h-full flex-col bg-card">
      <ScreenHeader title={shortName} backHref="/visit/home" />

      <div className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-4">
        <ItemPhotoGallery key={`gallery-${item.id}`} item={item} />

        <div className="flex animate-rise items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-[15px] font-semibold">
            {shopFirst.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
              <span className="truncate">{shopFirst}</span>
              {shop.rating > 0 && <><Star className="size-3 shrink-0 fill-current" aria-hidden /><span>{shop.rating.toFixed(1)}</span></>}
            </p>
            <p className="truncate text-[14px] text-muted-foreground">
              {[shop.neighborhood, shop.distanceKm ? c("km", { n: shop.distanceKm }) : "", item.condition ? conditionLabel(item.condition) : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <AvailabilitySummary item={item} lang={lang} />

        {rental ? (
          <>
            <div className="flex animate-rise flex-col gap-1 [animation-delay:60ms]">
              <div className="flex items-baseline justify-between gap-3 tabular-nums">
                <p className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
                  {c("perDay", { price: money(rental.dailyFeeCents) })}
                </p>
                <p className="text-[15px] text-muted-foreground">{c("total", { n, total: money(rental.dailyFeeCents * n) })}</p>
              </div>
              <p className="text-[15px] text-muted-foreground tabular-nums">
                {c("deposit", { deposit: money(rental.depositCents) })}
              </p>
              {rental.bindingCheckRequired && (
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-info">
                  <Wrench className="size-3.5 shrink-0" aria-hidden />
                  {c("binding")}
                </p>
              )}
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <p className="sr-only" id="days-label">
                {c("days")}
              </p>
              <div role="radiogroup" aria-labelledby="days-label" className="grid grid-cols-7 gap-1.5">
                {strip.slice(0, maxDays).map((d, i) => {
                  const dayNo = i + 1;
                  const inRange = dayNo <= n;
                  const selected = dayNo === n;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={c(dayNo === 1 ? "day1" : "dayN", { n: dayNo })}
                      onClick={() => setDays(dayNo)}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center rounded-xl text-center transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
                        selected
                          ? "bg-foreground text-background"
                          : inRange
                            ? "bg-muted text-foreground"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-[11px] font-medium uppercase opacity-70">{d.weekday}</span>
                      <span className="text-[17px] font-semibold tabular-nums">{d.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex animate-rise flex-col gap-2 [animation-delay:60ms]">
            <p className="text-[32px] leading-tight font-bold tracking-[-0.02em] tabular-nums">
              {money(item.priceCents ?? 0)}
            </p>
            <p className="text-[15px] text-muted-foreground">{item.description}</p>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {(rental || item.kind === "sale") && available ? (
            <>
              {(rental || (item.priceCents ?? 0) > 0) && (
                <Link href={`/visit/negotiate/${item.id}${rental ? `?days=${n}` : ""}`} className={cn(buttonVariants({ size: "lg" }), MAIN)}>
                  {c("negotiate")}
                </Link>
              )}
              <Button
                size="lg"
                variant={rental || (item.priceCents ?? 0) > 0 ? "outline" : "default"}
                className={MAIN}
                onClick={() => setRequestOpen(true)}
              >
                {rental ? c("chooseDates") : c("requestItem")}
              </Button>
            </>
          ) : (
            <Button size="lg" className={MAIN} disabled>
              {c("gone")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
