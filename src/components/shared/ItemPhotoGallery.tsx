"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { photosFor } from "@/lib/photos";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemPhotoGallery({ item }: { item: Pick<Item, "id" | "name" | "photoUrl" | "photoUrls"> }) {
  const photos = photosFor(item);
  const [selected, setSelected] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const active = Math.min(selected, photos.length - 1);
  const multiple = photos.length > 1;

  function move(direction: number) {
    setSelected((active + direction + photos.length) % photos.length);
  }

  return (
    <div
      role="region"
      aria-roledescription={multiple ? "carousel" : undefined}
      aria-label={`${item.name} photos`}
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (!multiple) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0];
        touchStart.current = null;
        if (!multiple || !start || !end) return;
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      }}
      className="relative aspect-[3/2] shrink-0 overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[active]}
        alt={multiple ? `${item.name}, photo ${active + 1} of ${photos.length}` : item.name}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />

      {multiple && (
        <>
          <span aria-hidden className="absolute top-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-sm text-ink-foreground tabular-nums">
            {active + 1} / {photos.length}
          </span>
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            Photo {active + 1} of {photos.length}
          </p>

          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => move(-1)}
            className="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground transition-colors duration-150 outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-primary/30"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => move(1)}
            className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground transition-colors duration-150 outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-primary/30"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div
            role="group"
            aria-label="Choose a photo"
            className={cn("absolute inset-x-3 bottom-2 flex gap-2 overflow-x-auto [scrollbar-width:none]", photos.length > 6 ? "justify-start" : "justify-center")}
          >
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                aria-label={`Show ${item.name}, photo ${index + 1} of ${photos.length}`}
                aria-pressed={index === active}
                onClick={() => setSelected(index)}
                className={cn(
                  "size-11 shrink-0 overflow-hidden rounded-lg border-2 bg-card transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
                  index === active ? "border-primary" : "border-card/80 hover:border-foreground/40"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" draggable={false} className="size-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
