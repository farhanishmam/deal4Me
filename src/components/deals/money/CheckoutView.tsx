"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, MapPin, PackageX } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemSummary } from "@/components/shared/ItemSummary";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useHydrated, useItem, useShop, useStore } from "@/lib/store";
import { approveCopy, type ApproveKey } from "./approve/copy";
import { NavRow, Steps } from "./approve/Parts";
import { PhoneSkeleton } from "./Parts";
import { when } from "./terms";

const Hairline = () => <div className="mx-4 h-px bg-border" aria-hidden />;

export function CheckoutView({ itemId }: { itemId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const item = useItem(itemId);
  const shop = useShop(item?.shopId);
  const visitor = useStore((s) => s.visitor);
  const negotiationId = params.get("negotiation");
  const negotiation = useStore((s) =>
    s.negotiations.find((n) => n.id === negotiationId),
  );

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const locked = useRef(false);

  const lang = visitor.language;
  const t = (key: ApproveKey, vars?: Record<string, string | number>) =>
    approveCopy(lang, key, vars);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!hydrated) return <PhoneSkeleton />;

  const terms = item?.rental;
  if (!item || !terms) {
    return (
      <EmptyState
        icon={<PackageX />}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <Link
            href="/visit/home"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("emptyBack")}
          </Link>
        }
        className="my-auto"
      />
    );
  }

  const deal =
    negotiation &&
    negotiation.itemId === itemId &&
    negotiation.status === "deal" &&
    negotiation.agreedDailyCents
      ? negotiation
      : undefined;
  const daily = deal?.agreedDailyCents ?? terms.dailyFeeCents;
  const asked = Number(params.get("days"));
  const days = deal
    ? deal.days
    : Math.min(
        terms.maxDays,
        Math.max(
          1,
          Number.isFinite(asked) && asked > 0 ? Math.round(asked) : 3,
        ),
      );
  const fee = days * daily;
  const hold = fee + terms.depositCents;
  const holdText = money(hold);
  const feeText = money(fee);
  const depositText = money(terms.depositCents);
  const [cardA, cardB] = t("card").split("••••");
  const backHref = deal
    ? `/visit/negotiate/${itemId}?negotiation=${deal.id}`
    : `/visit/negotiate/${itemId}?days=${days}`;
  const pickupDate =
    visitor.tripStart && !Number.isNaN(Date.parse(visitor.tripStart))
      ? when(visitor.tripStart)
      : undefined;

  async function authorize() {
    if (locked.current) return;
    locked.current = true;
    setFailed(null);
    setBusy(true);
    try {
      const rental = await api.createRentalHold({
        itemId,
        days,
        negotiationId: deal?.id,
      });
      router.push(`/visit/rentals/${rental.id}`);
    } catch (e) {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        setFailed(e instanceof Error && e.message ? e.message : "");
      }
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-card">
      <ScreenHeader title={t("title")} backHref={backHref} />

      <div className="flex flex-1 flex-col justify-between">
        <div className="px-4 pt-2 pb-2 [&_p]:text-foreground [&_p:first-child]:text-[19px] [&_p:first-child]:leading-tight">
          <ItemSummary
            item={item}
            lines={[shop?.name ?? "", t("rentalDays", { n: days })].filter(
              Boolean,
            )}
          />
        </div>
        <Hairline />

        <section className="px-4 pt-2">
          <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {t("cardHold")}
          </h2>
          <div className="mt-2 flex items-center gap-6">
            <p className="text-[46px] leading-none font-bold tracking-[-0.04em]">
              {holdText}
            </p>
            <span className="rounded-lg bg-muted px-2.5 py-1.5 text-[15px] leading-tight whitespace-nowrap">
              {t("held")}
            </span>
          </div>

          <dl className="mt-3 text-[16px]">
            <div className="flex h-[34px] items-center justify-between border-t border-border">
              <dt>{t("fee", { n: days, price: money(daily) })}</dt>
              <dd className="font-medium">{feeText}</dd>
            </div>
            <div className="flex h-[34px] items-center justify-between border-t border-border">
              <dt>{t("deposit")}</dt>
              <dd className="font-medium">{depositText}</dd>
            </div>
          </dl>
          <p className="border-t border-border pt-2 pb-2 text-[13px] leading-snug text-foreground">
            {t("after", { fee: feeText, deposit: depositText })}
          </p>
        </section>
        <Hairline />

        <div className="px-4 py-1.5">
          <Steps
            steps={[
              t("step1", { hold: holdText }),
              t("step2"),
              t("step3", { fee: feeText }),
            ]}
          />
        </div>
        <Hairline />

        <div className="px-4">
          <NavRow
            href={`/visit/item/${itemId}`}
            icon={<MapPin strokeWidth={1.75} />}
            title={shop?.neighborhood || shop?.name || ""}
            sub={
              terms.bindingCheckRequired
                ? t("binding")
                : pickupDate
            }
            className="min-h-[52px]!"
          />
          <div className="h-px bg-border" aria-hidden />
          <NavRow
            href="/visit/profile"
            icon={<CreditCard strokeWidth={1.75} />}
            className="min-h-[52px]!"
            title={
              <>
                {cardA}
                <span
                  aria-hidden
                  className="ml-0.5 mr-1 inline-flex gap-[3px] align-middle"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <i
                      key={i}
                      className="block size-[5px] rounded-full bg-current"
                    />
                  ))}
                </span>
                {cardB}
              </>
            }
          />
        </div>
        <Hairline />
      </div>

      <div className="sticky bottom-0 z-10 bg-card px-4 pt-3 pb-2.5">
        <Button
          size="lg"
          className="h-12 w-full rounded-xl text-[17px] font-semibold"
          onClick={authorize}
          disabled={busy}
        >
          {busy ? t("authorizing") : t("cta", { hold: holdText })}
        </Button>
        {failed === null ? (
          <p className="mt-1.5 text-center text-[13px] leading-tight text-foreground">
            {t("simulated")}
          </p>
        ) : (
          <div
            role="alert"
            className="mt-1.5 text-center text-[13px] leading-tight"
          >
            <p className="text-destructive">{t("failed")}</p>
            {failed && (
              <p className="mt-0.5 text-muted-foreground">{failed}</p>
            )}
          </div>
        )}
        {deal && (
          <Link
            href={`/visit/messages/${deal.id}`}
            className={buttonVariants({
              variant: "ghost",
              className:
                "mt-1 h-10 w-full rounded-xl text-[15px] font-semibold text-info hover:text-info",
            })}
          >
            {t("messageSeller")}
          </Link>
        )}
      </div>
    </div>
  );
}
