import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/lib/brand";
import { StoreHydrator } from "@/lib/store-hydrator";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export const viewport: Viewport = {
  themeColor: "#f7f7f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreHydrator />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
