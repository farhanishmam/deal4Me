import type { Metadata } from "next";
import { SignInForm } from "@/components/marketing/SignInForm";
import { SignInPanel } from "@/components/marketing/SignInPanel";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Sign in · ${BRAND.name}` };

export default function Page() {
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <SignInPanel />
      <div className="flex min-h-[640px] flex-col bg-background">
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:py-16">
          <SignInForm />
        </main>
        <footer className="border-t border-border px-4 py-5 text-label text-muted-foreground sm:px-8">
          &copy; {BRAND.name}
        </footer>
      </div>
    </div>
  );
}
