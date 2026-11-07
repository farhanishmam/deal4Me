import { Logo } from "@/components/shared/Logo";

const bullets = ["Orders and rentals", "Storefront Studio", "Payouts"];

export function SignInPanel() {
  return (
    <aside className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-full bg-[url('/brand/ridge-dark.svg')] bg-cover bg-bottom bg-no-repeat lg:h-[46%] lg:bg-top"
      />
      <div className="flex h-full flex-col px-6 py-6 lg:px-14 lg:py-12">
        <Logo tone="ink" size="md" />

        <div className="mt-10 lg:mt-24">
          <span className="text-eyebrow inline-flex h-7 items-center rounded-full border border-ink-border bg-ink-raised px-3 uppercase">
            Seller studio
          </span>
          <h1 className="mt-5 max-w-[11ch] text-[40px] leading-[1.06] font-bold tracking-[-0.03em] text-balance lg:mt-6 lg:text-display">
            Your shop, in one place.
          </h1>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-ink-muted lg:mt-5 lg:text-[17px]">
            Orders, rentals and payouts for Salt Lake sellers.
          </p>
          <ul className="mt-8 hidden space-y-3.5 lg:block">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[15px]">
                <span className="grid size-6 place-items-center rounded-full bg-ink-border">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
