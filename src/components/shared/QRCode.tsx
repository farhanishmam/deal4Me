"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function QRCode({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex rounded-xl border border-border bg-white p-3 text-ink", className)}
      role="img"
      aria-label="QR code"
    >
      <QRCodeSVG value={value} size={size} fgColor="currentColor" bgColor="transparent" level="M" />
    </span>
  );
}
