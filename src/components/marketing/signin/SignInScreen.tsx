"use client";

import { SignInForm } from "@/components/marketing/SignInForm";
import { SignInPanel } from "@/components/marketing/SignInPanel";
import { BRAND } from "@/lib/brand";
import { signinDisplay, signinSerif } from "./fonts";
import "./signin-theme.css";
import { THEME_BY_ID } from "./themes";
import { ThemePicker } from "./ThemePicker";
import { setSignInTheme, useSignInTheme, useThemeReady } from "./useSignInTheme";

/** The whole login screen. One wrapper carries data-theme; the theme CSS does the rest. */
export function SignInScreen() {
  const id = useSignInTheme();
  const ready = useThemeReady();
  const theme = THEME_BY_ID[id];

  return (
    <div
      data-theme={id}
      data-ready={ready}
      className={`signin-root ${signinSerif.variable} ${signinDisplay.variable} grid min-h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[1fr_auto] lg:grid-rows-none lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]`}
    >
      <SignInPanel theme={theme} />
      <div className="flex flex-col lg:min-h-[640px]">
        <main className="flex flex-1 flex-col justify-center gap-4 px-4 pt-3 pb-5 lg:gap-10 lg:px-8 lg:py-12">
          <div className="mx-auto w-full max-w-[400px] lg:max-w-[460px]">
            <ThemePicker value={id} onChange={setSignInTheme} />
          </div>
          <SignInForm />
        </main>
        <footer className="hidden border-t border-border px-8 py-5 text-label text-muted-foreground lg:block">
          &copy; {BRAND.name}
        </footer>
      </div>
    </div>
  );
}
