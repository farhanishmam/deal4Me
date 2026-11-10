"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  return (
    <form
      className="mx-auto w-full max-w-[400px] lg:max-w-[460px]"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/sell/dashboard");
      }}
    >
      <h2 className="signin-title hidden text-title lg:block">Sign in</h2>
      <p className="mt-2 hidden text-sm text-muted-foreground lg:block">Welcome back to your seller studio.</p>

      <div className="space-y-3 lg:mt-8 lg:space-y-5">
        <div className="space-y-1.5 lg:space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@shop.com"
            className="h-11 text-[15px] placeholder:text-muted-foreground sm:text-sm"
          />
        </div>
        <div className="space-y-1.5 lg:space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pr-16 text-[15px] sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-16 items-center justify-center rounded-r-lg text-sm font-semibold text-(--link) hover:text-primary-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between lg:mt-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="grid size-[18px] place-items-center rounded-[5px] border border-input bg-card text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-primary/15"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Keep me signed in
        </label>
        <Link
          href="/sign-in"
          className="flex min-h-11 items-center text-sm font-semibold text-(--link) hover:text-primary-hover"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" className="h-12 w-full lg:mt-3">
        Sign in
      </Button>

      <p className="mt-3 text-center text-sm text-muted-foreground lg:mt-8">
        New here?{" "}
        <Link href="/sell/start" className="inline-flex min-h-11 items-center font-semibold text-(--link) hover:text-primary-hover">
          Start selling
        </Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Visiting Salt Lake?{" "}
        <Link href="/visit" className="inline-flex min-h-11 items-center font-semibold text-(--link) hover:text-primary-hover">
          Open the visitor app
        </Link>
      </p>
    </form>
  );
}
