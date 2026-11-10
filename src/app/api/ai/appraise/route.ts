import { appraisePhoto } from "@/server/ai/appraise";
import type { ImageMediaType } from "@/server/ai/claude";
import { aiFailure } from "@/server/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form-data" }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof File)) return Response.json({ error: "Missing photo" }, { status: 400 });
  if (photo.size === 0) return Response.json({ error: "Photo is empty. Choose a valid image." }, { status: 400 });
  if (!TYPES.includes(photo.type)) return Response.json({ error: "Photo must be jpeg, png, webp or gif" }, { status: 415 });
  if (photo.size > MAX_BYTES) return Response.json({ error: "Photo must be 5 MB or smaller" }, { status: 413 });
  const kindRaw = form.get("kind");
  if (kindRaw !== null && kindRaw !== "sale" && kindRaw !== "rental" && kindRaw !== "food" && kindRaw !== "auto") return Response.json({ error: "kind must be sale, rental, food, or auto" }, { status: 400 });
  const hintRaw = form.get("hint");
  const hint = typeof hintRaw === "string" && hintRaw.trim() ? hintRaw.trim() : undefined;

  try {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    const out = await appraisePhoto({ mediaType: photo.type as ImageMediaType, base64, kind: kindRaw ?? "sale", hint });
    return Response.json(out);
  } catch (error) {
    return aiFailure(error, "Could not appraise this photo. Please try again.");
  }
}
