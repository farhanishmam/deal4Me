import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Timer } from "@/components/shared/Timer";

/** The owner's photos, with the crops the landing page uses (they avoid power lines and parking lots). */
const PHOTOS = {
  lawn: {
    src: "/demo/scenes/lawn-mountains.jpg",
    focus: "6% 50%",
    zoom: "scale-[1.12] origin-bottom",
  },
  peak: {
    src: "/demo/scenes/wasatch-peak.jpg",
    focus: "50% 50%",
    zoom: "",
  },
} as const;

export type FlowPhoto = keyof typeof PHOTOS;

/**
 * The ink stage for a sell flow: a soft, scrimmed photo behind a centered column.
 * The photo is fixed to the viewport, so it never scrolls with the content.
 */
export function FlowStage({ photo, children }: { photo: FlowPhoto; children: ReactNode }) {
  const p = PHOTOS[photo];
  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
        <div className={`absolute inset-x-0 top-0 h-[54dvh] lg:inset-0 lg:h-auto ${p.zoom}`}>
          <Image
            src={p.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70 saturate-[0.8] lg:opacity-60"
            style={{ objectPosition: p.focus }}
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background to-transparent lg:hidden" />
        </div>
        <div className="absolute inset-0 bg-background/35" />
        <div className="hidden lg:block absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_52%,var(--background)_0%,transparent_100%)] opacity-80" />
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-background to-transparent" />
      </div>
      <div className="relative z-10 flex w-full flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Back link on the left, the onboarding clock on the right. Quiet on purpose. */
export function FlowTopBar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href="/sell/start"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <Timer name="onboarding" size="sm" className="font-mono text-muted-foreground" />
    </div>
  );
}

/** Mono eyebrow, one big tight headline, one quiet line. */
export function FlowHeading({
  eyebrow,
  title,
  sub,
  compact = false,
  srOnly = false,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  compact?: boolean;
  srOnly?: boolean;
}) {
  if (srOnly) return <h1 className="sr-only">{title}</h1>;
  return (
    <div className="animate-rise flex flex-col items-center text-center">
      <p className="mb-4 font-mono text-[12px] tracking-wide text-muted-foreground uppercase sm:text-[13px]">{eyebrow}</p>
      <h1
        className={
          compact
            ? "text-[36px] leading-[1.02] font-bold tracking-[-0.04em] text-foreground sm:text-[52px]"
            : "text-[46px] leading-[1] font-bold tracking-[-0.045em] text-foreground sm:text-[72px] lg:text-[96px]"
        }
      >
        {title}
      </h1>
      {sub && <p className="mt-4 max-w-md text-[15px] leading-snug text-muted-foreground sm:mt-6 sm:text-[18px]">{sub}</p>}
    </div>
  );
}
