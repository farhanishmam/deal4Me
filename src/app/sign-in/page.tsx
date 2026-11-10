import type { Metadata } from "next";
import { SignInScreen } from "@/components/marketing/signin/SignInScreen";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Sign in · ${BRAND.name}` };

export default function Page() {
  return <SignInScreen />;
}
