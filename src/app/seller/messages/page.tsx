"use client";

import { ThreadList } from "@/components/messages/ThreadList";

// No accounts yet, so the seller profile answers every deal, whichever store it's on.
export default function Page() {
  return <ThreadList role="seller" />;
}
