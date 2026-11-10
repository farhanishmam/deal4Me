import { Suspense } from "react";
import { AgentChat } from "@/components/visitor/agent/AgentChat";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AgentChat />
    </Suspense>
  );
}
