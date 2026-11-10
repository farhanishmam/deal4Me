"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle } from "lucide-react";
import { QRCode } from "@/components/shared/QRCode";
import { Button, buttonVariants } from "@/components/ui/button";
import { duration } from "@/lib/format";
import { selectSellerShop } from "@/lib/seller";
import { useStore } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import "@/components/marketing/landing/landing.css";

const noSubscribe = () => () => {};

/** The "you're live" moment, shared by every onboarding path. Publishes the shop and stops the timer. */
export function SuccessMoment({ shop }: { shop: Shop }) {
  const publishShop = useStore((s) => s.publishShop);
  const published = useStore((s) => Boolean(s.shops.find((x) => x.id === shop.id)?.liveAt));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const seconds = useStore((s) => s.shops.find((x) => x.id === shop.id)?.onboardingSeconds) ?? shop.onboardingSeconds ?? 0;
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const publicPath = `/s/${shop.slug}`;

  useEffect(() => {
    if (published) return;
    let active = true;
    void publishShop(shop.id).then(() => {
      const state = useStore.getState();
      if (active && !state.shops.find((x) => x.id === shop.id)?.liveAt) {
        setError(state.syncError ?? "Your shop could not be published. Try again.");
      }
    }).catch((failure) => {
      if (active) setError(failure instanceof Error ? failure.message : "Your shop could not be published. Try again.");
    });
    return () => { active = false; };
  }, [publishShop, shop.id, attempt, published]);

  if (!published) {
    return (
      <section
        aria-live="polite"
        className="animate-rise flex min-h-[60dvh] flex-col items-start justify-end gap-4 rounded-3xl border border-ink-border bg-ink-raised p-6 sm:p-12"
      >
        {!error && <LoaderCircle aria-hidden className="size-6 animate-spin text-ink-muted motion-reduce:animate-none" />}
        <p className="font-mono text-[12px] tracking-wide text-ink-muted uppercase">{shop.name}</p>
        <h2 className="text-[40px] leading-[1.02] font-bold tracking-[-0.04em] text-ink-foreground sm:text-[64px]">
          {error ? "One more step" : "Opening your storefront"}
        </h2>
        <p className="text-[15px] text-ink-muted">{error ?? "Saving your shop and making it available to visitors."}</p>
        <Button
          size="lg"
          disabled={!error}
          className="h-12 rounded-xl px-8 text-[17px] font-semibold"
          onClick={() => { setError(null); setAttempt((value) => value + 1); }}
        >
          {error ? "Retry publish" : "Publishing..."}
        </Button>
      </section>
    );
  }

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-14rem)] flex-col justify-end text-ink-foreground">
      <div aria-hidden className="cin-fade pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
        <Image
          src="/demo/scenes/wasatch-brick.jpg"
          alt=""
          fill
          sizes="100vw"
          className="origin-top-right scale-[1.18] object-cover saturate-[0.95] lg:hidden"
          style={{ objectPosition: "100% 50%" }}
        />
        <Image
          src="/demo/scenes/lawn-mountains.jpg"
          alt=""
          fill
          sizes="100vw"
          className="hidden object-cover saturate-[0.9] lg:block"
          style={{ objectPosition: "0% 50%" }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-ink/55 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/70 to-transparent" />
      </div>
      <div className="flex flex-col gap-10 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="animate-rise font-mono text-[12px] tracking-wide text-ink-muted uppercase sm:text-[14px]">{shop.name}</p>
          <h2
            className="animate-rise mt-3 text-[56px] leading-[0.98] font-bold tracking-[-0.045em] tabular-nums text-ink-foreground sm:text-[96px] lg:text-[128px]"
            style={{ animationDelay: "150ms" }}
          >
            Live in {duration(seconds)}
          </h2>
          <p className="animate-rise mt-4 text-[15px] text-ink-muted sm:text-[20px]" style={{ animationDelay: "260ms" }}>
            Your storefront is ready for visitors.
          </p>
          <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "360ms" }}>
            <Link
              href="/seller/listings"
              onClick={() => selectSellerShop(shop.id)}
              className={cn(buttonVariants({ size: "lg" }), "h-12 min-w-44 rounded-xl px-8 text-[17px] font-semibold sm:h-14")}
            >
              Open my listings
            </Link>
            <Link
              href={`/sell/studio/${shop.id}`}
              onClick={() => selectSellerShop(shop.id)}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-ink-border bg-ink/45 px-8 text-[17px] font-semibold text-ink-foreground backdrop-blur-md transition-colors duration-150 hover:bg-ink-raised sm:h-14"
            >
              Edit storefront
            </Link>
            <Link
              href={publicPath}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-ink-border bg-ink/45 px-8 text-[17px] font-semibold text-ink-foreground backdrop-blur-md transition-colors duration-150 hover:bg-ink-raised sm:h-14"
            >
              View public page
            </Link>
          </div>
        </div>
        <QRCode value={`${origin}${publicPath}`} size={148} className="animate-rise hidden self-start rounded-2xl border-transparent sm:inline-flex lg:self-end" />
      </div>
    </section>
  );
}
