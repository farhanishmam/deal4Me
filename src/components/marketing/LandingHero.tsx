import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <section className="animate-rise relative isolate overflow-hidden rounded-2xl bg-ink text-ink-foreground">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[url('/brand/ridge-dark.svg')] bg-cover bg-bottom bg-no-repeat"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent" />
      <div className="flex min-h-[440px] flex-col justify-end px-6 pt-24 pb-8 sm:min-h-[520px] sm:px-14 sm:pb-14 lg:min-h-[685px] lg:px-16 lg:pb-16">
        <h1 className="text-display max-w-[13ch] text-[40px] text-balance max-sm:leading-[1.06] max-sm:tracking-[-0.03em] sm:text-display lg:text-[76px]">
          Salt Lake, ready for 2034&rsquo;s visitors.
        </h1>
        <p className="mt-5 text-pretty max-w-[34ch] text-[15px] leading-relaxed text-ink-muted sm:mt-6 sm:max-w-[40ch] sm:text-[17px]">
          Shops and locals go live in minutes. Visitors&rsquo; agents find the deals.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sell/start" className={cn(buttonVariants({ size: "lg" }), "max-sm:h-12 sm:min-w-40")}>
            Start selling
          </Link>
          <Link
            href="/visit"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-ink-border bg-transparent text-ink-foreground hover:bg-ink-raised hover:text-ink-foreground dark:bg-transparent dark:hover:bg-ink-raised sm:min-w-40"
            )}
          >
            I&rsquo;m visiting
          </Link>
        </div>
      </div>
    </section>
  );
}
