import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Three numbered steps joined by a thin connector line. The first one is the active step. */
export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col pl-[13px]">
      {steps.map((label, i) => (
        <li key={label} className="relative flex h-[38px] items-center gap-[19px]">
          <span
            className={cn(
              "relative z-10 flex size-[26px] shrink-0 items-center justify-center rounded-full text-[15px] font-medium tabular-nums",
              i === 0 ? "bg-primary text-primary-foreground" : "bg-border text-foreground",
            )}
          >
            {i + 1}
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute top-[32px] left-[12.5px] h-3 w-px bg-foreground/15" />
          )}
          <span className="text-[17px] leading-tight">{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** A tappable row: icon, title, optional muted line, arrow on the right. */
export function NavRow({
  href,
  icon,
  title,
  sub,
  className,
}: {
  href: string;
  icon: ReactNode;
  title: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-14 items-center gap-5 pl-[14px] rounded-lg outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15 [&_svg]:size-6 [&_svg]:shrink-0",
        className,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[17px] leading-tight", sub && "font-semibold")}>{title}</span>
        {sub && <span className="mt-0.5 block truncate text-sm leading-tight text-foreground">{sub}</span>}
      </span>
      <ArrowRight aria-hidden strokeWidth={1.5} className="text-foreground" />
    </Link>
  );
}
