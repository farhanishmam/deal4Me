"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNav } from "../hooks";
import { Icon, type IconName } from "./Icon";

export type TabKey = "home" | "capture" | "memory" | "calendar" | "people";

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "capture", label: "Capture", icon: "mic" },
  { key: "memory", label: "Memory", icon: "layers" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "people", label: "People", icon: "people" },
];

/** Floating 64px pill nav from the design (padding 8/16/22 around it). */
export function TabBar({ active }: { active: TabKey }) {
  const nav = useNav();
  return (
    <nav aria-label="Main" className="flex-none bg-rp-bg px-4 pt-2 pb-[22px]">
      <div className="grid h-16 grid-cols-5 items-center rounded-3xl border border-rp-line bg-rp-nav px-1.5 shadow-rp">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={nav[t.key]}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 text-[11px]",
                on ? "font-semibold text-rp-gold" : "font-medium text-rp-text3",
              )}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
