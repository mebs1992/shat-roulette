import { MAX_IMAGE_CHARS } from "@/worker/protocol";

/** Longest edge we keep. A phone photo is way bigger; nobody needs more in a chat bubble. */
const MAX_EDGE = 1280;
/** Quality steps we try, high to low, until the data URL fits under the relay cap. */
const QUALITY_STEPS = [0.72, 0.6, 0.5, 0.4, 0.3];

export class ImageTooBig extends Error {}
export class NotAnImage extends Error {}

/**
 * Reads a picked file, downscales it, and re-encodes to a JPEG data URL small
 * enough to relay. Nothing is uploaded or stored — the string is handed to the
 * WebSocket and lives only in the two chat windows.
 */
export async function fileToChatImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new NotAnImage("Not an image");

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new NotAnImage("Canvas unavailable");
  // Beige backing so a transparent PNG doesn't come out black once flattened to JPEG.
  ctx.fillStyle = "#efe4d2";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  for (const q of QUALITY_STEPS) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= MAX_IMAGE_CHARS) return url;
  }
  throw new ImageTooBig("Image is too large to send even after compressing");
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some formats (e.g. certain HEIC) fail here; fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new NotAnImage("Could not decode image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
