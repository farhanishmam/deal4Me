import { Suspense } from "react";
import { StorefrontPage } from "./StorefrontPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex-1 bg-background" aria-busy />}>
      <StorefrontPage />
    </Suspense>
  );
}
