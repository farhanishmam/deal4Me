import type { Lang } from "@/lib/types";

// Speech to text through the local mlx-audio server (`npm run stt`).

export class SttUnavailableError extends Error {
  constructor(message = "STT server unreachable") {
    super(message);
    this.name = "SttUnavailableError";
  }
}

export interface Transcript {
  text: string;
  lang: Lang | null;
  rawLanguage: string | null;
  ms: number;
}

const NAMES: Record<string, Lang> = {
  en: "en", english: "en",
  ja: "ja", japanese: "ja", jp: "ja",
  es: "es", spanish: "es",
  fr: "fr", french: "fr",
  de: "de", german: "de",
  ko: "ko", korean: "ko",
  zh: "zh", chinese: "zh", mandarin: "zh", cantonese: "zh", yue: "zh",
};

function toLang(raw: string | null): Lang | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return NAMES[key] ?? NAMES[key.split(/[-_]/)[0]] ?? null;
}

export async function transcribe(audio: Blob, filename: string, signal?: AbortSignal): Promise<Transcript> {
  const base = process.env.STT_URL ?? "http://127.0.0.1:8765";
  const model = process.env.STT_MODEL ?? "mlx-community/whisper-large-v3-turbo-asr-fp16";
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", model);
  form.append("response_format", "verbose_json");

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${base}/v1/audio/transcriptions`, {
      method: "POST",
      body: form,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw new SttUnavailableError(e instanceof Error ? e.message : undefined);
  }
  if (!res.ok) throw new Error(`STT server returned ${res.status}`);

  const json = (await res.json()) as { text?: string; language?: string | string[] | null };
  const lng = Array.isArray(json.language) ? json.language[0] : json.language;
  const rawLanguage = typeof lng === "string" && lng ? lng : null;
  return {
    text: (json.text ?? "").trim(),
    lang: toLang(rawLanguage),
    rawLanguage,
    ms: Date.now() - t0,
  };
}
