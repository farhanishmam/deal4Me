import { readFile } from "node:fs/promises";
import { WEBSITE_DEMOS } from "../src/lib/website-demo.ts";
import { VOICE_DEMO_SCRIPTS } from "../src/lib/voice-demo.ts";
import { DEMO_GEAR_PHOTOS, DEMO_FOOD_PHOTOS } from "../src/lib/demo-photos.ts";

const base = process.argv[2] ?? "http://localhost:3000";
let failed = false;

async function post(path, body) {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  return response;
}

async function check(label, task) {
  const started = Date.now();
  try {
    const detail = await task();
    console.log(`${label}: ${detail} (${Date.now() - started} ms)`);
  } catch (error) {
    failed = true;
    console.error(`${label}: ${error.message}`);
  }
}

for (const demo of WEBSITE_DEMOS) {
  await check(`Website / ${demo.id}`, async () => {
    const read = async () => {
      const response = await post("/api/ai/restyle", { url: demo.url });
      const lines = (await response.text()).split("\n").filter(Boolean).map((line) => JSON.parse(line));
      const error = lines.find((line) => line.type === "error");
      if (error) throw new Error(error.error);
      const result = lines.find((line) => line.type === "result")?.result;
      if (!result?.items?.length) throw new Error("No source items returned");
      return result;
    };
    const first = await read();
    const replay = await read();
    if (!replay.cached || JSON.stringify(first.items) !== JSON.stringify(replay.items)) throw new Error("Cache replay did not match");
    return `${first.items.length} real items; stable cache ready`;
  });
}

for (const demo of VOICE_DEMO_SCRIPTS) {
  await check(`Description / ${demo.id}`, async () => {
    const first = await (await post("/api/ai/describe", { text: demo.text })).json();
    const replay = await (await post("/api/ai/describe", { text: demo.text })).json();
    if (!first.items?.length || !replay.cached || JSON.stringify(first.items) !== JSON.stringify(replay.items)) throw new Error("Cache replay did not match");
    return `${first.items.length} extracted items; stable cache ready`;
  });
}

for (const photo of [...DEMO_GEAR_PHOTOS, ...DEMO_FOOD_PHOTOS]) {
  await check(`Photo / ${photo.name}`, async () => {
    const bytes = await readFile(new URL(`../public${photo.src}`, import.meta.url));
    const form = new FormData();
    form.set("photo", new File([bytes], "sample.jpg", { type: "image/jpeg" }));
    form.set("kind", photo.prices.food ? "food" : "rental");
    const result = await (await post("/api/ai/appraise", form)).json();
    if (result.demoSource !== "captured_ai" || !result.suggestion?.amountCents) throw new Error("Expected the captured image appraisal");
    return `$${result.suggestion.amountCents / 100}; captured image result ready`;
  });
}

console.log("Voice recording uses real transcription each time. Keep npm run stt running and allow the browser microphone.");
process.exitCode = failed ? 1 : 0;
