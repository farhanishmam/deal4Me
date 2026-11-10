"use client";

import { Check } from "lucide-react";
import { ACCENT_SWATCHES } from "@/components/storefront/swatches";
import { THEMES, THEME_LABELS } from "@/lib/mock-data";
import { getShop, useShop, useStore } from "@/lib/store";
import type { StorefrontTheme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Segmented } from "./Segmented";
import type { FlashTarget } from "./StudioView";

const PRESETS = Object.keys(THEMES) as StorefrontTheme["preset"][];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-label text-muted-foreground">{children}</p>;
}

export function DesignPanel({ shopId, onFlash }: { shopId: string; onFlash: (t: FlashTarget) => void }) {
  const shop = useShop(shopId);
  if (!shop) return null;
  const theme = shop.storefront.theme;

  const update = (next: StorefrontTheme) => {
    const current = getShop(shopId);
    if (!current) return;
    useStore.getState().upsertShop({ ...current, storefront: { ...current.storefront, theme: next } });
    onFlash("all");
  };

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Label>Style</Label>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map((p) => {
            const t = THEMES[p];
            const on = theme.preset === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => update(t)}
                className={cn(
                  "group flex flex-col gap-2.5 rounded-xl border p-2.5 text-left transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15",
                  on ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/25"
                )}
              >
                <span
                  aria-hidden
                  className="relative block h-16 overflow-hidden rounded-lg"
                  style={{ background: t.background }}
                >
                  <span className="absolute top-2.5 left-2.5 h-2 w-10 rounded-full" style={{ background: t.text, opacity: 0.8 }} />
                  <span className="absolute top-6 left-2.5 h-5 w-14 rounded" style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.text}22` }} />
                  <span className="absolute top-6 left-[4.25rem] h-5 w-7 rounded" style={{ background: t.primary }} />
                  <span className="absolute right-2.5 bottom-2.5 size-3 rounded-full" style={{ background: t.accent }} />
                </span>
                <span className="flex items-center justify-between px-0.5 text-sm font-semibold">
                  {THEME_LABELS[p]}
                  {on && <Check className="size-4 text-primary" strokeWidth={2.5} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Accent</Label>
        <div className="flex flex-wrap gap-3">
          {ACCENT_SWATCHES.map((s) => {
            const on = theme.primary.toLowerCase() === s.primary;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.label}
                aria-pressed={on}
                title={s.label}
                onClick={() => update({ ...theme, primary: s.primary, accent: s.accent })}
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-full outline-none transition-shadow duration-150 focus-visible:ring-3 focus-visible:ring-primary/25",
                  on ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "hover:ring-2 hover:ring-border hover:ring-offset-2 hover:ring-offset-card"
                )}
                style={{ background: s.primary }}
              >
                <span aria-hidden className="absolute right-0 bottom-0 size-4 rounded-full border-2 border-card" style={{ background: s.accent }} />
                {on && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Font</Label>
        <Segmented
          className="w-full"
          label="Font"
          value={theme.font}
          onChange={(font) => update({ ...theme, font })}
          options={[
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
            { value: "rounded", label: "Rounded" },
          ]}
        />
      </div>

      <div>
        <Label>Corners</Label>
        <Segmented
          className="w-full"
          label="Corners"
          value={theme.radius}
          onChange={(radius) => update({ ...theme, radius })}
          options={[
            { value: "sm", label: "Sharp" },
            { value: "md", label: "Soft" },
            { value: "lg", label: "Round" },
          ]}
        />
      </div>
    </div>
  );
}
