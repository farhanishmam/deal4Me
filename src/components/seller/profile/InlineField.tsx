"use client";

import { useId, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** One value that edits in place: tap the row, change it, save with Enter or the button. */
export function InlineField({
  label,
  value,
  empty,
  required,
  maxLength = 80,
  onSave,
}: {
  label: string;
  value: string;
  /** What to show while the value is blank. */
  empty: string;
  required?: boolean;
  maxLength?: number;
  onSave: (next: string) => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (required && !next) {
      setError(`${label} cannot be blank.`);
      return;
    }
    setEditing(false);
    if (next !== value) {
      onSave(next);
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 1600);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span className="w-28 shrink-0 text-[15px] text-muted-foreground">{label}</span>
        <span className={`min-w-0 flex-1 truncate text-[15px] ${value ? "font-medium text-foreground" : "text-muted-foreground/70"}`}>
          {value || empty}
        </span>
        {saved ? <Check aria-label="Saved" className="size-4 shrink-0 text-success" strokeWidth={2.5} /> : <Pencil aria-hidden className="size-4 shrink-0 text-muted-foreground/70" />}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <label htmlFor={id} className="text-label text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        autoFocus
        value={draft}
        maxLength={maxLength}
        placeholder={empty}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            setEditing(false);
          }
        }}
        className="h-11 text-[15px]"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={commit} className="h-9 px-4">
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-9 px-3">
          Cancel
        </Button>
      </div>
    </div>
  );
}
