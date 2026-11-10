"use client";

import { useRef } from "react";
import { THEMES, type ThemeId } from "./themes";

/**
 * Theme picker: the reference's swatch rows as a radio group. Arrow keys move the
 * selection, Home and End jump, and only the selected option is in the tab order.
 */
export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (id: ThemeId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(to: number) {
    const next = (to + THEMES.length) % THEMES.length;
    onChange(THEMES[next].id);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(index - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(THEMES.length - 1);
        break;
    }
  }

  return (
    <div>
      <p id="signin-theme-label" className="text-eyebrow mb-2.5 hidden text-muted-foreground uppercase lg:block">
        Theme
      </p>
      <div role="radiogroup" aria-labelledby="signin-theme-label" className="grid grid-cols-3 gap-2 lg:gap-3">
        {THEMES.map((t, i) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex min-h-[62px] flex-col items-start justify-center gap-2 rounded-xl border bg-card px-2.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:px-4 lg:py-3.5 ${
                selected ? "border-transparent ring-2 ring-primary" : "border-border hover:border-input"
              }`}
            >
              <span className="flex gap-1" aria-hidden>
                {t.swatches.map((c) => (
                  <span key={c} className="size-5 rounded-md border border-black/10 lg:size-6" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="text-[13px] leading-none font-semibold whitespace-nowrap text-foreground">{t.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
