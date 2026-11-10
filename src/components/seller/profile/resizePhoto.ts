const MAX_SIDE = 1280;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Shrinks a picked picture to at most 1280px and returns it as a JPEG data URL. */
export async function pictureToJpegDataUrl(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Choose a JPG, PNG, WebP or GIF picture.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That picture could not be opened. Choose a valid image file.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare your picture. Try another browser.");
  }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not prepare your picture.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read your picture. Choose it again."));
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read your picture."));
    reader.readAsDataURL(blob);
  });
}
