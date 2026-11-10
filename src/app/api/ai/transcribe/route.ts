import { SttUnavailableError, transcribe } from "@/server/ai/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

function extFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("mp4") && t.startsWith("audio/mp4")) return "m4a";
  if (t.includes("mp4")) return "mp4";
  if (t.includes("m4a") || t.includes("aac")) return "m4a";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  return "webm";
}

export async function POST(req: Request) {
  let audio: FormDataEntryValue | null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return Response.json({ error: "Expected multipart form-data" }, { status: 400 });
  }
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "Missing audio field" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) return Response.json({ error: "Audio too large" }, { status: 413 });
  if (audio.size < 1024) return Response.json({ text: "", lang: null });

  try {
    const r = await transcribe(audio, `audio.${extFor(audio.type)}`, req.signal);
    return Response.json({ text: r.text, lang: r.lang, ms: r.ms });
  } catch (e) {
    if (e instanceof SttUnavailableError) {
      return Response.json({ error: "stt_unavailable", hint: "Run npm run stt" }, { status: 503 });
    }
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }
}
