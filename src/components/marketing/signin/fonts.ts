import { Bricolage_Grotesque, Fraunces } from "next/font/google";

// Serif for the Golden Local headline. Allowed on the sign-in screen only.
export const signinSerif = Fraunces({
  subsets: ["latin"],
  variable: "--font-signin-serif",
  axes: ["opsz"],
  display: "swap",
});

// Display face for the Park & Pine headline.
export const signinDisplay = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-signin-display", display: "swap" });
