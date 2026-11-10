import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { rpFontVars } from "@/rapport/fonts";
import { PREPAINT_SCRIPT, RapportRoot } from "@/rapport/RapportRoot";

export const metadata: Metadata = {
  title: "Rapport",
  description: "Your agent networks for you.",
};

export const viewport: Viewport = {
  themeColor: "#0B0D11",
  viewportFit: "cover",
};

export default function RapportLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      <div className={`${rpFontVars} relative h-dvh w-full overflow-hidden bg-rp-bg font-rp-sans text-rp-text`}>
        <RapportRoot>{children}</RapportRoot>
      </div>
    </>
  );
}
