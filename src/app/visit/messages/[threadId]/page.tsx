"use client";

import { useParams } from "next/navigation";
import { ThreadView } from "@/components/messages/ThreadView";

export default function Page() {
  const { threadId } = useParams<{ threadId: string }>();
  return <ThreadView threadId={decodeURIComponent(threadId)} role="buyer" />;
}
