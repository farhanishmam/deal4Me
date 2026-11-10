import { ImportItemCard } from "@/components/onboarding/import/ImportItemCard";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "@/lib/types";

/** Four stages on the left, item cards arriving on the right. */
export function ImportProgress({ steps, current, items }: { steps: string[]; current: number; items: Item[] }) {
  const working = current < steps.length;
  return (
    <div className="mx-auto grid w-full max-w-4xl animate-rise grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
      <div className="h-fit rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md sm:p-6">
        <ProgressSteps steps={steps} current={current} orientation="vertical" tone="ink" />
      </div>
      <div>
        <p aria-live="polite" className="mb-3 font-mono text-[12px] tracking-wide text-muted-foreground uppercase tabular-nums">
          {items.length === 0 ? "Looking for items" : `${items.length} ${items.length === 1 ? "item" : "items"} found`}
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <ImportItemCard key={item.id} item={item} />
          ))}
          {working && items.length < 6 && (
            <>
              <li aria-hidden><Skeleton className="h-[78px] rounded-xl border border-border bg-card/70" /></li>
              <li aria-hidden className="hidden sm:block"><Skeleton className="h-[78px] rounded-xl border border-border bg-card/70" /></li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
