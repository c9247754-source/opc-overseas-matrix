"use client";

/**
 * Load rembg from CDN so Next/webpack does not bundle onnxruntime-web.
 * Bundling causes: TypeError: url.replace / e.replace is not a function
 * (known with @imgly/background-removal + Next 14).
 */
export async function removeBackgroundClient(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.("Loading background-removal library…");

  // webpackIgnore: keep this as a real browser ESM import (CDN), not a webpack chunk
  const mod = await import(
    /* webpackIgnore: true */
    "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
  );

  const removeBackground =
    (mod as { removeBackground?: RemoveBackgroundFn }).removeBackground ||
    (mod as { default?: { removeBackground?: RemoveBackgroundFn } }).default
      ?.removeBackground;

  if (!removeBackground) {
    throw new Error("Failed to load background-removal from CDN");
  }

  const blob = await removeBackground(file, {
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 0.92,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || !total) return;
      const pct = Math.min(100, Math.round((current / total) * 100));
      onProgress(`Loading model ${String(key)}: ${pct}%`);
    },
  });

  return blobToDataUrl(blob);
}

type RemoveBackgroundFn = (
  image: File | Blob | string | ImageData,
  config?: Record<string, unknown>
) => Promise<Blob>;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read cutout"));
    reader.readAsDataURL(blob);
  });
}
