import { PhoneFrame } from "@/components/shared/PhoneFrame";
import { VisitorTabBar } from "@/components/shared/VisitorTabBar";

export default function VisitLayout({ children }: LayoutProps<"/visit">) {
  return <PhoneFrame footer={<VisitorTabBar />}>{children}</PhoneFrame>;
}
