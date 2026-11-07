"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Sparkles, Ticket, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/visit/home", label: "Home", icon: House, match: ["/visit/home", "/visit/item", "/visit/order"] },
  { href: "/visit/agent", label: "Agent", icon: Sparkles, match: ["/visit/agent", "/visit/negotiate"] },
  { href: "/visit/trips", label: "Trips", icon: Ticket, match: ["/visit/trips", "/visit/rentals", "/visit/receipt", "/visit/checkout"] },
  { href: "/visit/profile", label: "Profile", icon: UserRound, match: ["/visit/profile"] },
] as const;

export function VisitorTabBar() {
  const pathname = usePathname();
  if (pathname === "/visit" || pathname === "/visit/") return null;

  return (
    <nav
      aria-label="Main"
      className="relative z-20 shrink-0 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),0px)] sm:pb-3"
    >
      <ul className="grid h-16 grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <li key={href} className="contents">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-150 outline-none",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className="size-[22px] transition-transform duration-150 group-active:scale-90"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
