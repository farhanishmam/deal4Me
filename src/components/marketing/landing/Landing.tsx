import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./landing.css";

type Shot = {
  src: string;
  alt: string;
  /** object-position: which part of the photo to keep. */
  focus: string;
  /** Zoom and grade classes that crop out parking lots, power lines, railings. */
  zoom?: string;
  /** Inline CSS filter that replaces the base saturation, for photos that are too loud. */
  grade?: string;
};

const S = "/demo/scenes/";

const LAWN: Shot = {
  src: `${S}lawn-mountains.jpg`,
  alt: "Sunlit lawn and shade trees with the Wasatch Range beyond",
  focus: "52% 50%",
  zoom: "scale-[1.12] origin-bottom",
};
const BRICK: Shot = {
  src: `${S}wasatch-brick.jpg`,
  alt: "A leafy tree with the Wasatch Range and clouds beyond",
  focus: "100% 50%",
  zoom: "scale-[1.18] origin-top-right",
};
const FOOTHILLS: Shot = {
  src: `${S}foothills-campus.jpg`,
  alt: "Golden-hour foothills rising behind campus and autumn trees",
  focus: "100% 50%",
  zoom: "scale-[1.65] origin-top-right",
};
const JUNIPER: Shot = {
  src: `${S}snow-juniper.jpg`,
  alt: "A juniper shrub under fresh snow",
  focus: "45% 45%",
};
const PEAK: Shot = {
  src: `${S}wasatch-peak.jpg`,
  alt: "A rugged Wasatch peak under white clouds",
  focus: "50% 50%",
  zoom: "scale-[1.9] origin-[80%_78%]",
};
const STREET: Shot = {
  src: `${S}neighborhood-street.jpg`,
  alt: "A street tree on a quiet neighborhood road at dusk",
  focus: "0% 50%",
  zoom: "scale-[1.5] origin-[19%_68%] brightness-110",
};
const PARK: Shot = {
  src: `${S}park-lawn.jpg`,
  alt: "Park lawn with a pavilion and tall trees",
  focus: "18% 50%",
  zoom: "scale-[1.3] origin-top-left",
  grade: "saturate(0.72)",
};

/** Phone filmstrip: the six photos that are not the hero (the hero is the brick-building photo, cropped to the ridge). */
const STRIP: Shot[] = [FOOTHILLS, LAWN, JUNIPER, PEAK, STREET, PARK];

type Tile = { shot: Shot; h: number; sizes: string; focus?: string; zoom?: string };

/* Desktop columns, 3 / 2 / 3 tiles. Every set is at least 1107px, so each column holds two copies and no photo repeats within a column on load. Tile heights and zooms keep every image at or under about 1.4x its source on a 2x screen. */
const COLUMNS: { tiles: Tile[]; dir: "up" | "down"; seconds: number; start: number }[] = [
  {
    dir: "up",
    seconds: 150,
    start: -10,
    tiles: [
      { shot: BRICK, h: 640, sizes: "460px", zoom: "scale-[1.25] origin-top-right" },
      { shot: FOOTHILLS, h: 250, sizes: "490px", focus: "100% 0%", zoom: "scale-[1.7] origin-top-right" },
      { shot: PARK, h: 280, sizes: "860px", focus: "18% 50%", zoom: "scale-[1.3] origin-top-left" },
    ],
  },
  {
    dir: "down",
    seconds: 130,
    start: -110,
    tiles: [
      { shot: PEAK, h: 600, sizes: "570px", focus: "62% 50%", zoom: "" },
      { shot: JUNIPER, h: 560, sizes: "750px", focus: "42% 45%" },
    ],
  },
  {
    dir: "up",
    seconds: 170,
    start: -6,
    tiles: [
      { shot: LAWN, h: 370, sizes: "900px", focus: "58% 50%", zoom: "scale-[1.1] origin-bottom" },
      { shot: STREET, h: 420, sizes: "390px", zoom: "scale-[1.35] origin-[19%_68%] brightness-110" },
      { shot: PEAK, h: 300, sizes: "460px", focus: "100% 45%", zoom: "scale-[1.6] origin-[100%_45%]" },
    ],
  },
];

/** Copies of a column set needed so the loop never shows a gap in a 1107px view. */
function copies(tiles: Tile[]) {
  const set = tiles.reduce((n, t) => n + t.h + 12, 0);
  return set >= 1107 ? 2 : 3;
}

const SUB = (
  <>
    Salt Lake gear and food, negotiated for you.
    <br />
    You approve every booking.
  </>
);

/** The proof, as one static line: the ski rental starts at $60 and the agent lands $41. */
function Eyebrow({ className }: { className: string }) {
  return (
    <p className={`font-mono tracking-wide text-ink-muted uppercase tabular-nums ${className}`}>
      Ski rental <s>$60</s> <span aria-hidden>&rarr;</span> <span className="text-ink-foreground">$41</span> a day
    </p>
  );
}

const ghostLink =
  "inline-flex items-center justify-center rounded-full border border-ink-border bg-ink/45 text-ink-foreground backdrop-blur-md transition-colors duration-150 hover:bg-ink-raised";

export function Landing() {
  return (
    <main className="bg-ink text-ink-foreground">
      <PhoneLayout />
      <DesktopLayout />
    </main>
  );
}

function PhoneLayout() {
  return (
    <section className="flex h-dvh flex-col overflow-hidden bg-ink lg:hidden">
      {/* Photo one, full bleed, scrimmed into the page */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute right-0 top-0 h-[120%] w-[120%]">
          <Image
            src={BRICK.src}
            alt={BRICK.alt}
            fill
            priority
            sizes="468px"
            className="cin-hero-img object-cover saturate-[0.95]"
            style={{ objectPosition: "100% 0%" }}
          />
        </div>
        <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/70 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] bg-linear-to-t from-ink via-ink/70 to-transparent" />

        <header className="absolute inset-x-0 top-0 flex h-14 items-center justify-between px-4 pt-2">
          <Link href="/" aria-label="Home" className="flex">
            <Logo tone="ink" />
          </Link>
          <Link href="/sign-in" className={`${ghostLink} h-11 px-4 text-[14px] font-medium`}>
            Sign in
          </Link>
        </header>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
          <Eyebrow className="animate-rise mb-[10px] text-[12px]" />
          <h1
            className="animate-rise text-[54px] leading-[1] font-bold tracking-[-0.04em] text-ink-foreground"
            style={{ animationDelay: "250ms" }}
          >
            Your agent
            <br />
            gets the deal.
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-5">
        <div className="animate-rise grid grid-cols-6 gap-1.5" style={{ animationDelay: "380ms" }}>
          {STRIP.map((s) => (
            <div
              key={s.src}
              className="relative h-[104px] overflow-hidden rounded-lg bg-ink-raised ring-1 ring-ink-border"
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="160px"
                className={`object-cover saturate-[0.95] ${s.zoom ?? ""}`}
                style={{ objectPosition: s.focus, filter: s.grade }}
              />
            </div>
          ))}
        </div>

        <p
          className="animate-rise mt-4 text-[15px] leading-snug text-ink-muted"
          style={{ animationDelay: "480ms" }}
        >
          {SUB}
        </p>

        <div className="animate-rise mt-4 flex flex-col gap-1" style={{ animationDelay: "560ms" }}>
          <Link href="/visit" className={cn(buttonVariants(), "h-12 w-full rounded-xl text-[17px] font-semibold")}>
            I&rsquo;m buying
          </Link>
          <Link
            href="/seller"
            className="inline-flex h-11 items-center justify-center rounded-xl text-[15px] font-semibold text-ink-foreground transition-colors duration-150 hover:bg-ink-raised"
          >
            I&rsquo;m selling
          </Link>
          <Link
            href="/sell/start"
            className="inline-flex h-8 items-center justify-center text-[13px] text-ink-muted transition-colors duration-150 hover:text-ink-foreground"
          >
            New seller? Start your store
          </Link>
        </div>
      </div>
    </section>
  );
}

function DesktopLayout() {
  return (
    <section className="relative hidden h-dvh overflow-hidden bg-ink lg:block">
      {/* Drifting photo columns, edge to edge on the right */}
      <div className="cin-fade absolute inset-y-0 right-0 grid w-[52%] grid-cols-3 gap-3" style={{ animationDelay: "100ms" }}>
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
                <div key={copy} aria-hidden={copy > 0 ? true : undefined} className="flex flex-col gap-3 pb-3">
                  {col.tiles.map((t) => (
                    <div
                      key={t.shot.src}
                      className="relative shrink-0 overflow-hidden rounded-xl bg-ink-raised"
                      style={{ height: t.h }}
                    >
                      <Image
                        src={t.shot.src}
                        alt={copy === 0 ? t.shot.alt : ""}
                        fill
                        sizes={t.sizes}
                        className={`object-cover saturate-[0.8] ${t.zoom ?? t.shot.zoom ?? ""}`}
                        style={{ objectPosition: t.focus ?? t.shot.focus, filter: t.shot.grade }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/12" />
      </div>

      {/* Ink scrims: left blend into the headline, top and bottom like letterbox edges */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/85 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink/85 to-transparent" />

      <header className="absolute left-24 top-0 z-10 flex w-[633px] items-center justify-between pt-10">
        <Link href="/" aria-label="Home" className="flex">
          <Logo tone="ink" size="lg" />
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex h-11 items-center text-[15px] font-medium text-ink-foreground transition-colors duration-150 hover:text-ink-muted"
        >
          Sign in
        </Link>
      </header>

      <div className="relative z-10 flex h-full w-[48%] flex-col justify-center pl-24">
        <Eyebrow className="animate-rise mb-5 text-[14px]" />
        <h1
          className="animate-rise text-[108px] leading-[0.98] font-bold tracking-[-0.045em] text-ink-foreground"
          style={{ animationDelay: "200ms" }}
        >
          Your agent
          <br />
          gets the deal.
        </h1>
        <p
          className="animate-rise mt-8 text-[20px] leading-snug text-ink-muted"
          style={{ animationDelay: "330ms" }}
        >
          {SUB}
        </p>
        <div className="animate-rise mt-10 flex items-center gap-3" style={{ animationDelay: "430ms" }}>
          <Link href="/visit" className={cn(buttonVariants(), "h-14 min-w-44 rounded-xl px-8 text-[17px] font-semibold")}>
            I&rsquo;m buying
          </Link>
          <Link
            href="/seller"
            className="inline-flex h-14 items-center justify-center rounded-xl border border-ink-border px-8 text-[17px] font-semibold text-ink-foreground transition-colors duration-150 hover:bg-ink-raised"
          >
            I&rsquo;m selling
          </Link>
          <Link
            href="/sell/start"
            className="ml-3 text-[15px] text-ink-muted transition-colors duration-150 hover:text-ink-foreground"
          >
            New seller? Start your store
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-10 left-24 z-10 flex w-[633px] items-center justify-between text-[13px] text-ink-muted">
        <span className="font-mono tracking-wide">SALT LAKE CITY &middot; 40.76&deg; N 111.89&deg; W</span>
      </footer>
    </section>
  );
}
