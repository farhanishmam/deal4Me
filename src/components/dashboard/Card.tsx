import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      style={style}
      className={cn(
        "flex animate-rise flex-col rounded-xl border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  aside,
}: {
  title: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-heading">{title}</h2>
      {aside}
    </header>
  );
}
