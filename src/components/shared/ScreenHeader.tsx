import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/** The visitor app's inner-screen header: back arrow, title, optional item on the right. */
export function ScreenHeader({
  title,
  backHref,
  aside,
}: {
  title: string;
  backHref: string;
  aside?: ReactNode;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 px-4">
      <Link
        href={backHref}
        aria-label="Back"
        className="-ml-2 flex size-10 items-center justify-center rounded-full outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <ArrowLeft className="size-[22px]" strokeWidth={2} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.018em]">{title}</h1>
      {aside}
    </header>
  );
}
