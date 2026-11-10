/** Rehearsal scripts still go through real speech transcription and extraction. */
export const VOICE_DEMO_SCRIPTS = [
  {
    id: "ski",
    label: "Ski shop",
    text: "I run Juniper Gear, a ski rental shop near campus. Skis rent for thirty five dollars a day, and ski and boot sets rent for forty five dollars a day.",
  },
  {
    id: "taco",
    label: "Taco truck",
    text: "I run Canyon Taco Co., a taco truck near campus. Carne asada tacos are four dollars, the burrito is eleven dollars, horchata is four dollars, and nachos are nine dollars.",
  },
] as const;

export type VoiceDemoScript = typeof VOICE_DEMO_SCRIPTS[number];
export const VOICE_DEMO_SCRIPT = VOICE_DEMO_SCRIPTS[1].text;

const NUMBER_WORDS: Record<string, string> = { four: "4", eleven: "11", nine: "9" };

export function normalizeDescription(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\bthirty[ -]five\b/g, "35")
    .replace(/\bforty[ -]five\b/g, "45")
    .replace(/\b(four|eleven|nine)\b/g, (word) => NUMBER_WORDS[word])
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function spokenDemoTokens(text: string): string {
  return normalizeDescription(text)
    .replace(/\bcompany\b/g, "co")
    // This pronunciation is a common Whisper rendering of the Spanish name.
    .replace(/\borjata\b/g, "horchata")
    .replace(/\bbootsets?\b/g, "boot sets")
    .replace(/\bboot sets?\b/g, "boot set")
    .replace(/\bper day\b/g, "a day")
    .replace(/\b(tacos|burritos)\b/g, (word) => word.slice(0, -1))
    .replace(/\b(?:dollars?|the|and)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Only canonicalize this spoken script, including harmless STT spelling variations. */
export function isVoiceDemoDescription(text: string): boolean {
  return Boolean(voiceDemoForDescription(text));
}

export function voiceDemoForDescription(text: string): VoiceDemoScript | undefined {
  const tokens = spokenDemoTokens(text);
  return VOICE_DEMO_SCRIPTS.find((script) => spokenDemoTokens(script.text) === tokens);
}

export function descriptionCacheKey(text: string): string {
  const script = voiceDemoForDescription(text);
  return script ? script.id === "taco" ? "voice-demo-v1" : "voice-demo-ski-v1" : normalizeDescription(text);
}
