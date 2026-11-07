import { StatusPill } from "@/components/shared/StatusPill";
import type { PillTone } from "@/components/shared/StatusPill";
import { conditionLabel } from "@/lib/format";
import type { Condition } from "@/lib/types";

const tone: Record<Condition, PillTone> = {
  new: "success",
  like_new: "info",
  good: "neutral",
  used: "warning",
};

export function ConditionBadge({ condition, className }: { condition: Condition; className?: string }) {
  return (
    <StatusPill tone={tone[condition]} className={className}>
      {conditionLabel(condition)}
    </StatusPill>
  );
}
