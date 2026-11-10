"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Palette, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/Logo";
import { useSellerShop } from "@/lib/seller";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

const NAV: NavItem[] = [
  { href: "/sell/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/sell/dashboard", "/sell/rentals"] },
  { href: "/sell/studio", label: "Studio", icon: Palette, match: ["/sell/studio"] },
  { href: "/sell/start", label: "Start selling", icon: Rocket, match: ["/sell/start", "/sell/setup"] },
];

const FOCUS_ROUTES = ["/sell/start", "/sell/import", "/sell/photos", "/sell/describe"];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { shop } = useSellerShop();
  const nav = NAV.map((n) =>
    n.href === "/sell/studio" ? { ...n, href: shop ? `/sell/studio/${shop.id}` : "/sell/start" } : n,
  );
  const render = (item: NavItem) => {
    const active = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
          active
            ? "bg-primary-soft font-semibold text-primary"
            : "font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
        {item.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Seller" className="flex flex-1 flex-col gap-1 pb-3">
      {nav.map(render)}
    </nav>
  );
}

function ShopCard() {
  const { shop, hydrated } = useSellerShop();
  if (!shop) {
    if (!hydrated) return null;
    return (
      <Link
        href="/sell/start"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <Rocket aria-hidden className="size-[18px] shrink-0 text-primary" />
        Create your store
      </Link>
    );
  }
  const neighborhood = shop.neighborhood?.trim();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-ink-foreground"
      >
        {shop.name.trim().charAt(0) || "S"}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{shop.name}</span>
        {neighborhood ? <span className="block truncate text-xs text-muted-foreground">{neighborhood}</span> : null}
      </span>
    </div>
  );
}

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const focus = FOCUS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const content = (
    <main className="mx-auto flex w-full max-w-[1454px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
      {children}
    </main>
  );

  if (focus) {
    return (
      <div className="theme-ink flex min-h-dvh flex-col bg-background">
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-4 sm:px-8">
          <Link href="/" aria-label="Home" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-primary/15">
            <Logo tone="ink" />
          </Link>
          <Link
            href="/seller"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
          >
            My store
          </Link>
        </header>
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card px-4 pt-5 pb-4 lg:flex">
        <Link href="/" aria-label="Home" className="mb-8 block rounded-md px-2 outline-none focus-visible:ring-3 focus-visible:ring-primary/15">
          <Logo />
        </Link>
        <NavLinks pathname={pathname} />
        <ShopCard />
      </aside>

      {/* top bar below lg */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-8 lg:hidden">
        <Link href="/" aria-label="Home" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-primary/15">
          <Logo size="sm" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="flex size-11 items-center justify-center rounded-lg text-foreground transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15 -mr-2"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 px-4 pt-5 pb-4 sm:max-w-72">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mb-8 px-2">
              <Logo />
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <ShopCard />
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:min-h-dvh lg:pl-64">{content}</div>
    </div>
  );
}
