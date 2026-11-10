"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppTab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Routes that keep this tab highlighted. */
  match: readonly string[];
  /** Fill the icon when active. */
  fill?: boolean;
  unread?: number;
}

/** The bottom bar of both phone apps, buyer and seller. */
export function AppTabBar({ tabs }: { tabs: AppTab[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="relative z-20 shrink-0 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),0px)] sm:pb-3"
    >
      <ul className="grid h-16 grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match, fill, unread }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <li key={href} className="contents">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={unread ? `${label}, ${unread} unread` : label}
                className={cn(
                  "group flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-150 outline-none",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-[22px] transition-transform duration-150 group-active:scale-90"
                    strokeWidth={active ? 2.25 : 1.75}
                    fill={active && fill ? "currentColor" : "none"}
                  />
                  {unread ? (
                    <span aria-hidden className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
