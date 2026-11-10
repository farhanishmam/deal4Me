"use client";

import { useState } from "react";
import { useVoiceInput } from "@/lib/real/useVoiceInput";

interface SearchResult {
  filter: unknown;
  matches: { id: string; name: string }[];
  cards: { title: string; subtitle: string; priceLabel: string }[];
  summary: string;
  parsedBy: string;
  ms: number;
}

export default function VoiceTestPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [heard, setHeard] = useState<{ text: string; lang: string | null } | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [text, setText] = useState("");
  const voice = useVoiceInput({
    onPartialText: setText,
    onText: (text, lang) => {
      setText(text);
      setHeard({ text, lang });
    },
  });
  const recording = voice.state === "listening";
  const voiceBusy = voice.state !== "idle";

  async function search(query: string) {
    const res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    setResult((await res.json()) as SearchResult);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 bg-background p-6 text-foreground">
      <h1 className="text-xl font-semibold">Voice search test</h1>
      <button
        onClick={voice.toggle}
        disabled={busy || voice.state === "processing"}
        className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
          recording ? "bg-destructive-soft text-destructive" : "bg-primary text-primary-foreground hover:bg-primary-hover"
        }`}
      >
        {recording ? "Stop recording" : voice.state === "processing" ? "Finishing transcript" : busy ? "Working" : "Start recording"}
      </button>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!voiceBusy && text.trim()) void run(() => search(text.trim()));
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={voiceBusy}
          placeholder="Or type a search"
          className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm"
        />
        <button disabled={busy || voiceBusy || !text.trim()} className="rounded-lg bg-muted px-3 py-2 text-sm">Search</button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {voice.error && <p role="alert" className="text-sm text-destructive">{voice.error}</p>}
      {heard && (
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          {heard.text || "No speech detected"}
          <span className="block text-xs text-muted-foreground">
            {heard.lang ?? "unknown language"}
          </span>
        </p>
      )}
      {result && (
        <section className="space-y-3">
          <p className="text-sm">{result.summary}</p>
          <pre className="overflow-auto rounded-xl bg-muted/60 p-3 text-xs">{JSON.stringify(result.filter, null, 2)}</pre>
          <ul className="space-y-2">
            {result.cards.map((c, i) => (
              <li key={result.matches[i]?.id ?? i} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">{c.title}</p>
                <p className="text-muted-foreground">{c.subtitle} · {c.priceLabel}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
