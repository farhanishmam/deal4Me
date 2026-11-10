"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Photo } from "./scan-utils";

const STEPS = ["Reading your item", "Checking rent and resale prices", "Setting a fair price"];

/** The photo with a soft scanning line and plain words about what is happening. */
export function WorkingView({ photo, onCancel }: { photo?: Photo; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 1500);
    const c = setTimeout(() => setStep(2), 5000);
    const b = setTimeout(() => setSlow(true), 11000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink text-ink-foreground">
      <style>{`@keyframes d4m-scan{0%{top:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:100%;opacity:0}}`}</style>
      <div className="relative mx-4 mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-ink-raised">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="Your item" className="animate-pop size-full object-contain" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-ink/30" />
        <span
          aria-hidden
          className="absolute inset-x-0 h-24 -translate-y-full bg-gradient-to-b from-transparent to-white/25 motion-safe:animate-[d4m-scan_2.2s_var(--ease-soft)_infinite] motion-reduce:hidden"
        >
          <span className="absolute inset-x-0 bottom-0 h-px bg-white/80" />
        </span>
      </div>

      <div className="shrink-0 px-4 pt-6 pb-5 text-center" role="status" aria-live="polite">
        <p key={step} className="animate-rise text-[20px] font-bold tracking-[-0.018em]">
          {STEPS[step]}
        </p>
        <div aria-hidden className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 w-6 rounded-full transition-colors duration-300 ${i <= step ? "bg-ink-foreground" : "bg-ink-border"}`} />
          ))}
        </div>
        <p className="mt-3 h-5 text-[14px] text-ink-muted">{slow ? "Still working. Thanks for waiting." : ""}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mx-auto mt-2 flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold text-ink-muted outline-none transition-colors duration-150 hover:text-ink-foreground focus-visible:ring-3 focus-visible:ring-primary/40"
        >
          <X className="size-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
