import { SellerShell } from "@/components/shared/SellerShell";

export default function SellLayout({ children }: LayoutProps<"/sell">) {
  return <SellerShell>{children}</SellerShell>;
}
