"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { DescribeArt, ImportArt, PhotosArt } from "./art";
import { OptionRow } from "./OptionRow";
import "@/components/marketing/landing/landing.css";

const OPTIONS = [
  { path: "import", title: "Import my website", time: "1 min", art: <ImportArt /> },
  { path: "photos", title: "Snap up to 12 photos", time: "2 min", art: <PhotosArt /> },
  { path: "describe", title: "Just tell us", time: "30 sec", art: <DescribeArt /> },
];

const S = "/demo/scenes/";

type Tile = { src: string; alt: string; h: number; sizes: string; focus: string; zoom?: string; grade?: string };

const FOOTHILLS = { src: `${S}foothills-campus.jpg`, alt: "Golden-hour foothills rising behind campus and autumn trees" };
const LAWN = { src: `${S}lawn-mountains.jpg`, alt: "Sunlit lawn and shade trees with the Wasatch Range beyond" };
const PEAK = { src: `${S}wasatch-peak.jpg`, alt: "A rugged Wasatch peak under white clouds" };
const STREET = { src: `${S}neighborhood-street.jpg`, alt: "A street tree on a quiet neighborhood road at dusk" };
const JUNIPER = { src: `${S}snow-juniper.jpg`, alt: "A juniper shrub under fresh snow" };
const BRICK = { src: `${S}wasatch-brick.jpg`, alt: "A leafy tree with the Wasatch Range and clouds beyond" };
const PARK = { src: `${S}park-lawn.jpg`, alt: "Park lawn with a pavilion and tall trees" };

/* Desktop columns, 3 / 2 / 2 tiles. Same crops that keep power lines and parking lots out of the landing, in new order and sizes. */
const COLUMNS: { tiles: Tile[]; dir: "up" | "down"; seconds: number; start: number }[] = [
  {
    dir: "down",
    seconds: 150,
    start: -60,
    tiles: [
      { ...FOOTHILLS, h: 560, sizes: "300px", focus: "100% 50%", zoom: "scale-[1.65] origin-top-right" },
      { ...LAWN, h: 320, sizes: "700px", focus: "40% 50%", zoom: "scale-[1.12] origin-bottom" },
      { ...PEAK, h: 300, sizes: "500px", focus: "62% 50%" },
    ],
  },
  {
    dir: "up",
    seconds: 130,
    start: -30,
    tiles: [
      { ...STREET, h: 640, sizes: "300px", focus: "0% 50%", zoom: "scale-[1.5] origin-[19%_68%] brightness-110" },
      { ...JUNIPER, h: 520, sizes: "700px", focus: "58% 45%" },
    ],
  },
  {
    dir: "down",
    seconds: 170,
    start: -140,
    tiles: [
      { ...BRICK, h: 600, sizes: "300px", focus: "100% 50%", zoom: "scale-[1.18] origin-top-right" },
      { ...PARK, h: 340, sizes: "700px", focus: "18% 50%", zoom: "scale-[1.3] origin-top-left", grade: "saturate(0.72)" },
    ],
  },
];

/** Copies of a column set needed so the loop never shows a gap in a 1107px view. */
function copies(tiles: Tile[]) {
  const set = tiles.reduce((n, t) => n + t.h + 12, 0);
  return set >= 1107 ? 2 : 3;
}

export function StartScreen() {
  const router = useRouter();
  const startTimer = useStore((s) => s.startTimer);
  const [picked, setPicked] = useState<string | null>(null);

  const go = (path: string) => {
    if (picked) return;
    setPicked(path);
    startTimer("onboarding");
    router.push(`/sell/${path}`);
  };

  return (
    <section className="relative z-10 flex w-full flex-1 flex-col lg:max-w-[660px] lg:justify-center lg:pb-20">
      {/* Desktop: drifting photo columns, edge to edge on the right, under the shell's top bar */}
      <div
        aria-hidden
        className="cin-fade pointer-events-none fixed inset-y-0 right-0 z-0 hidden w-[50%] grid-cols-3 gap-3 lg:grid"
        style={{ animationDelay: "100ms" }}
      >
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="relative h-full overflow-hidden">
            <div
              className={`cin-col ${col.dir === "up" ? "cin-col-up" : "cin-col-down"}`}
              style={{
                animationDuration: `${col.seconds}s`,
                animationDelay: `${col.start}s`,
                ["--cin-shift" as string]: `${100 / copies(col.tiles)}%`,
              }}
            >
              {Array.from({ length: copies(col.tiles) }, (_, copy) => copy).map((copy) => (
                <div key={copy} className="flex flex-col gap-3 pb-3">
                  {col.tiles.map((t) => (
                    <div key={t.src} className="relative shrink-0 overflow-hidden rounded-xl bg-ink-raised" style={{ height: t.h }}>
                      <Image
                        src={t.src}
                        alt=""
                        fill
                        sizes={t.sizes}
                        className={`object-cover saturate-[0.8] ${t.zoom ?? ""}`}
                        style={{ objectPosition: t.focus, filter: t.grade }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="absolute inset-0 bg-ink/12" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink/85 to-transparent" />
      </div>

      <div className="relative flex flex-1 flex-col justify-end pb-6 lg:flex-none lg:justify-start lg:pb-0">
        {/* Phone: a scrimmed photo band behind the headline, reaching up under the top bar */}
        <div aria-hidden className="absolute -inset-x-4 -top-22 bottom-0 overflow-hidden sm:-inset-x-8 lg:hidden">
          <div className="cin-hero-img absolute inset-0">
            <Image
              src={`${S}foothills-campus.jpg`}
              alt=""
              fill
              priority
              sizes="480px"
              className="object-cover saturate-[0.9] scale-[1.65] origin-top-right"
              style={{ objectPosition: "100% 50%" }}
            />
          </div>
          <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[70%] bg-linear-to-t from-ink via-ink/75 to-transparent" />
        </div>

        <div className="relative">
          <p className="animate-rise mb-3 font-mono text-[12px] tracking-wide text-ink-muted uppercase motion-reduce:animate-none lg:mb-5 lg:text-[14px]">
            Create your storefront
          </p>
          <h1
            className="animate-rise text-[52px] leading-none font-bold tracking-[-0.045em] text-ink-foreground motion-reduce:animate-none lg:text-[88px] lg:leading-[0.98]"
            style={{ animationDelay: "120ms" }}
          >
            Start selling
            <br />
            in 2&nbsp;minutes.
          </h1>
          <p
            className="animate-rise mt-4 text-[15px] leading-snug text-ink-muted motion-reduce:animate-none lg:mt-8 lg:text-[20px]"
            style={{ animationDelay: "220ms" }}
          >
            Pick a way in. We do the rest.
          </p>
        </div>
      </div>

      <ul aria-label="Ways to create your shop" className="relative lg:mt-12">
        {OPTIONS.map((option, index) => (
          <OptionRow
            key={option.path}
            title={option.title}
            time={option.time}
            art={option.art}
            delay={300 + index * 80}
            dimmed={picked !== null && picked !== option.path}
            busy={picked === option.path}
            disabled={picked !== null}
            onIntent={() => router.prefetch(`/sell/${option.path}`)}
            onPick={() => go(option.path)}
          />
        ))}
      </ul>
    </section>
  );
}
