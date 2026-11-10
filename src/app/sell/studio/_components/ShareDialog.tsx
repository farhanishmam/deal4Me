"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { QRCode } from "@/components/shared/QRCode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ShareDialog({
  open,
  onOpenChange,
  name,
  path,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);
  // Only read while the dialog is open, which happens in the browser.
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked. The link stays visible to copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share {name}</DialogTitle>
          <DialogDescription>Scan to open the page on a phone.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">{open && <QRCode value={url} size={176} />}</div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2.5 font-mono text-xs">{url}</span>
          <Button variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
