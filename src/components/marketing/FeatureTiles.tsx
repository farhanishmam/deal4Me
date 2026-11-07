import { PriceTag } from "@/components/shared/PriceTag";
import { StatusPill } from "@/components/shared/StatusPill";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

function Tile({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <article
      className="animate-rise flex flex-col rounded-xl border border-border bg-card p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-[176px] flex-col justify-center">{children}</div>
      <h2 className="text-heading mt-6 border-t border-border pt-5">{title}</h2>
    </article>
  );
}

/** A sign-up clock that has just stopped, with the three steps behind it. */
function TimerPreview() {
  const steps = ["Photos", "Price", "Live"];
  return (
    <div>
      <StatusPill tone="success" dot>
        Live
      </StatusPill>
      <p className="mt-3 text-[56px] leading-none font-bold tracking-[-0.035em] tabular-nums">1:32</p>
      <div className="mt-5 grid grid-cols-3 gap-1.5">
        {steps.map((s) => (
          <div key={s}>
            <div className="h-1 rounded-full bg-success" />
            <p className="text-label mt-2 text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One rental, as a visitor's agent sees it. */
function RentalPreview() {
  return (
    <div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/demo/items/mg-skis.svg"
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-lg border border-border object-cover"
        />
        <div className="min-w-0">
          <p className="text-heading truncate">Skis</p>
          <p className="text-label text-muted-foreground">Maya&rsquo;s Gear Garage</p>
        </div>
        <PriceTag cents={6000} perDay size="lg" className="ml-auto" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold tabular-nums">{money(30000)} deposit</span>
        <StatusPill tone="info">Held, not charged</StatusPill>
      </div>
    </div>
  );
}

/** Two offers walking toward each other. Ask comes down, offer goes up. */
function HaggleChart({ className }: { className?: string }) {
  // x runs over four rounds, y is dollars per day.
  const ask = "M6 10 C90 14 150 44 250 49 S300 50 330 50";
  const offer = "M6 86 C90 80 160 64 250 52 S300 50 330 50";
  return (
    <div className={className}>
      <p className="text-label text-muted-foreground">Deal reached</p>
      <PriceTag cents={4100} perDay size="xl" />
      <svg viewBox="0 0 336 96" className="mt-4 w-full" role="img" aria-label="Asking price and offer meeting at $41">
        <line x1="6" y1="50" x2="330" y2="50" className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />
        <path d={ask} fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
        <path d={offer} fill="none" className="stroke-info" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="10" r="3.5" className="fill-card stroke-primary" strokeWidth="1.5" />
        <circle cx="6" cy="86" r="3.5" className="fill-card stroke-info" strokeWidth="1.5" />
        <circle cx="330" cy="50" r="10" className="fill-success/15" />
        <circle cx="330" cy="50" r="4.5" className="fill-success" />
      </svg>
    </div>
  );
}

export function FeatureTiles({ className }: { className?: string }) {
  return (
    <section className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
      <Tile title="Live in 2 minutes" delay={80}>
        <TimerPreview />
      </Tile>
      <Tile title="Rent from locals" delay={140}>
        <RentalPreview />
      </Tile>
      <Tile title="An agent that haggles for you" delay={200}>
        <HaggleChart />
      </Tile>
    </section>
  );
}
