import Link from "next/link";
import { FeatureTiles } from "@/components/marketing/FeatureTiles";
import { LandingHero } from "@/components/marketing/LandingHero";
import { Logo } from "@/components/shared/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/demo"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground sm:block"
          >
            Table mode
          </Link>
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline" }))}>
            Sign in
          </Link>
        </nav>
      </header>
      <div className="flex flex-col gap-4 sm:gap-8">
        <LandingHero />
        <FeatureTiles />
      </div>
    </main>
  );
}
