import type { ReactNode } from "react";
import { Camera, Globe2, Mic } from "lucide-react";

/** One quiet icon per option, drawn with hairlines. The parent row's `group` drives the hover and focus state. */
function Mark({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border text-foreground transition-[background-color,color,border-color] duration-200 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background group-focus-visible:border-foreground group-focus-visible:bg-foreground group-focus-visible:text-background sm:size-14"
    >
      {children}
    </span>
  );
}

export function ImportArt() {
  return (
    <Mark>
      <Globe2 strokeWidth={1.5} className="size-5 sm:size-6" />
    </Mark>
  );
}

export function PhotosArt() {
  return (
    <Mark>
      <Camera strokeWidth={1.5} className="size-5 sm:size-6" />
    </Mark>
  );
}

export function DescribeArt() {
  return (
    <Mark>
      <Mic strokeWidth={1.5} className="size-5 sm:size-6" />
    </Mark>
  );
}
