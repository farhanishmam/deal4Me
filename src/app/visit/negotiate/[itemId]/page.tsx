import { Suspense } from "react";
import { NegotiateScreen } from "@/components/deals/negotiate/NegotiateScreen";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex-1" aria-busy />}>
      <NegotiateScreen />
    </Suspense>
  );
}
