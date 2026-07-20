"use client";

/**
 * Free in-browser background removal (ONNX WASM).
 * medium (isnet_fp16) = better edges, still free CDN — no API key.
 */
export async function removeBackgroundClient(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(file, {
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 0.92,
    },
    progress: (key, current, total) => {
      if (!onProgress || !total) return;
      const pct = Math.min(100, Math.round((current / total) * 100));
      onProgress(`Loading model ${key}: ${pct}%`);
    },
  });
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read cutout"));
    reader.readAsDataURL(blob);
  });
}
