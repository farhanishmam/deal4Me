import type { ReactNode } from "react";
import { MessagesSync } from "@/components/shared/MessagesSync";
import { PhoneFrame } from "@/components/shared/PhoneFrame";
import { SellerTabBar } from "@/components/shared/SellerTabBar";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame footer={<SellerTabBar />}>
      <MessagesSync />
      {children}
    </PhoneFrame>
  );
}
