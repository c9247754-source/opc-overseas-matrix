"use client";

import { useEffect, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";
import { removeBackgroundClient } from "@/lib/remove-bg-client";

type ExportSize = 1000 | 2000;

type ProcessResult = {
  previewUrl: string;
  watermarked: boolean;
  size?: ExportSize;
  message: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");
  const [size, setSize] = useState<ExportSize>(1000);
  const [shadow, setShadow] = useState(true);

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";

  useEffect(() => {
    const t = localStorage.getItem("snapshelf_unlock");
    if (t) setUnlockToken(t);
  }, []);

  async function onFileChange(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    setStatus("");
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
      setStatus(
        "Removing background (free, in browser)… first run downloads a model"
      );
      const cutoutBase64 = await removeBackgroundClient(file, setStatus);

      setStatus(`Building ${size}×${size} store-ready image…`);
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cutoutBase64,
          unlockToken: unlockToken || undefined,
          size,
          shadow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Process failed");
      setResult(data);
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium tracking-wide text-emerald-700">
          SnapShelf
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Product photos that look store-ready — in one click
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Free to try. Background removal runs in your browser — no paid AI API.
          Pay with Creem only when you need a clean export.
        </p>

        {unlockToken && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Clean export unlocked on this browser.
          </p>
        )}

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-700">
            Upload product photo
          </label>
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
              alt="Original"
              className="mt-4 max-h-64 rounded-lg border border-zinc-100 object-contain"
            />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Export size
              </p>
              <div className="mt-2 flex gap-2">
                {([1000, 2000] as ExportSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      size === s
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-300 text-zinc-700"
                    }`}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-700 sm:mt-6">
              <input
                type="checkbox"
                checked={shadow}
                onChange={(e) => setShadow(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Soft contact shadow
            </label>
          </div>

          <button
            type="button"
            disabled={!file || loading}
            onClick={processImage}
            className="mt-6 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Processing…" : "Make store-ready"}
          </button>

          {status && <p className="mt-3 text-sm text-zinc-500">{status}</p>}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {result && (
            <div className="mt-8 border-t border-zinc-100 pt-6">
              <p className="text-sm text-zinc-600">{result.message}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {preview && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Before
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Original"
                      className="max-h-72 w-full rounded-lg border border-zinc-100 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    After {result.size ? `(${result.size}×${result.size})` : ""}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.previewUrl}
                    alt="Result"
                    className="max-h-72 w-full rounded-lg border border-zinc-100 bg-white object-contain"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={result.previewUrl}
                  download={`snapshelf-${result.size || size}.png`}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm"
                >
                  Download
                </a>

                {creditsId ? (
                  <CreemCheckout
                    productId={creditsId}
                    successUrl="/success"
                    metadata={{ app: "snapshelf", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Remove watermark — $9
                    </button>
                  </CreemCheckout>
                ) : (
                  <span className="text-xs text-amber-700">
                    Set NEXT_PUBLIC_CREEM_PRODUCT_CREDITS
                  </span>
                )}

                {proId && (
                  <CreemCheckout
                    productId={proId}
                    successUrl="/success"
                    metadata={{ app: "snapshelf", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700"
                    >
                      Pro $19/mo
                    </button>
                  </CreemCheckout>
                )}

                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "Made with SnapShelf",
                        url: window.location.origin,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      alert("Link copied");
                    }
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Made with SnapShelf — free online product photo cleanup · Payments by
          Creem
        </p>
      </div>
    </main>
  );
}
