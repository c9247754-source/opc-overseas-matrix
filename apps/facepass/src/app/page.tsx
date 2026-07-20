"use client";

import { useEffect, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";

type ProcessResult = {
  previewUrl: string;
  watermarked: boolean;
  message: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";

  useEffect(() => {
    const t = localStorage.getItem("facepass_unlock");
    if (t) setUnlockToken(t);
  }, []);

  async function onFileChange(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    if (!f) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(f));
  }

  async function processImage() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), "")
      );
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: `data:${file.type};base64,${base64}`,
          unlockToken: unlockToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Process failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium tracking-wide text-indigo-700">
          FacePass
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Professional headshots from your selfies
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Try free. Upgrade with Creem when you need watermark-free photos.
        </p>

        {unlockToken && (
          <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            Clean pack unlocked on this browser.
          </p>
        )}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium">Upload a selfie</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-2 block w-full text-sm"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Selfie"
              className="mt-4 max-h-64 rounded-lg object-contain"
            />
          )}
          <button
            type="button"
            disabled={!file || loading}
            onClick={processImage}
            className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Generating…" : "Generate headshot"}
          </button>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-8 border-t pt-6">
              <p className="text-sm text-slate-600">{result.message}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.previewUrl}
                alt="Headshot"
                className="mt-4 max-h-72 rounded-lg object-contain"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={result.previewUrl}
                  download="facepass.png"
                  className="rounded-full border px-4 py-2 text-sm"
                >
                  Download
                </a>
                {creditsId && (
                  <CreemCheckout
                    productId={creditsId}
                    successUrl="/success"
                    metadata={{ app: "facepass", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Clean pack — $9
                    </button>
                  </CreemCheckout>
                )}
                {proId && (
                  <CreemCheckout
                    productId={proId}
                    successUrl="/success"
                    metadata={{ app: "facepass", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-indigo-600 px-4 py-2 text-sm text-indigo-700"
                    >
                      Pro $19/mo
                    </button>
                  </CreemCheckout>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          Made with FacePass — free AI headshots · Payments by Creem
        </p>
      </div>
    </main>
  );
}
