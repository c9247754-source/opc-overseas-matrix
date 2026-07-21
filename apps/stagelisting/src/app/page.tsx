"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";

type StageStyle =
  | "modern"
  | "scandinavian"
  | "luxury"
  | "coastal"
  | "minimal";

type ProcessResult = {
  previewUrl: string;
  style: StageStyle;
  watermarked: boolean;
  message: string;
  creditsLeft?: number;
};

const STYLES: { id: StageStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "scandinavian", label: "Scandinavian" },
  { id: "luxury", label: "Luxury" },
  { id: "coastal", label: "Coastal" },
  { id: "minimal", label: "Minimal" },
];

const SESSION_KEY = "stagelisting_last";
const UNLOCK_KEY = "stagelisting_unlock";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [style, setStyle] = useState<StageStyle>("modern");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");
  const [restored, setRestored] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";

  useEffect(() => {
    const t = localStorage.getItem(UNLOCK_KEY);
    if (t) setUnlockToken(t);
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        preview: string | null;
        result: ProcessResult;
        style: StageStyle;
      };
      if (saved?.result?.previewUrl) {
        setPreview(saved.preview);
        setResult(saved.result);
        setStyle(saved.style || "modern");
        setRestored(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onFileChange = useCallback(async (f: File | null) => {
    setResult(null);
    setRestored(false);
    setError(null);
    sessionStorage.removeItem(SESSION_KEY);
    if (!f) {
      setPreview(null);
      return;
    }
    setPreview(await fileToDataUrl(f));
  }, []);

  async function runStage() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setRestored(false);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preview,
          style,
          unlockToken: unlockToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Staging failed");
      if (data.unlockToken) {
        localStorage.setItem(UNLOCK_KEY, data.unlockToken);
        setUnlockToken(data.unlockToken);
      }
      setResult(data);
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ preview, result: data, style })
        );
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium tracking-wide text-amber-800">
          StageListing
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Stage empty listings in seconds
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          For real estate agents. Traditional virtual staging costs{" "}
          <span className="font-medium text-stone-800">$25–$75 per photo</span>.
          Get a listing-ready preview free — pay only for clean exports.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-600">
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1">
            1. Upload empty room
          </span>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1">
            2. Pick a style
          </span>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1">
            3. Download / pay to remove watermark
          </span>
        </div>

        {unlockToken && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Clean export unlocked on this browser.
          </p>
        )}

        <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void onFileChange(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
              dragging
                ? "border-amber-600 bg-amber-50"
                : "border-stone-300 bg-stone-50 hover:border-stone-400"
            }`}
          >
            <p className="text-sm font-medium text-stone-800">
              Drop empty room photo here, or click to upload
            </p>
            <p className="mt-1 text-xs text-stone-500">
              JPG / PNG / WebP · straight-on photos work best
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {preview && !result && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Empty room"
              className="mt-4 max-h-64 w-full rounded-lg border border-stone-100 object-contain"
            />
          )}

          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-stone-500">
            Style
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  style === s.id
                    ? "bg-stone-900 text-white"
                    : "border border-stone-300 text-stone-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!preview || loading}
            onClick={runStage}
            className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Staging… usually 10–30s" : "Stage this listing"}
          </button>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {result && (
            <div className="mt-8 border-t border-stone-100 pt-6">
              {restored && (
                <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  Restored your last result after leaving checkout.
                </p>
              )}
              <p className="text-sm text-stone-600">{result.message}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {preview && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Before
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Before"
                      className="max-h-72 w-full rounded-lg border border-stone-100 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                    After ({result.style})
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.previewUrl}
                    alt="Staged"
                    className="max-h-72 w-full rounded-lg border border-stone-100 object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={result.previewUrl}
                  download={`stagelisting-${result.style}.png`}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm"
                >
                  Download
                </a>
                {creditsId ? (
                  <CreemCheckout
                    productId={creditsId}
                    checkoutPath="/api/checkout"
                    successUrl="/success?plan=credits"
                    metadata={{ app: "stagelisting", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white"
                    >
                      Credits $9 — 100 clean exports
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
                    checkoutPath="/api/checkout"
                    successUrl="/success?plan=pro"
                    metadata={{ app: "stagelisting", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-amber-700 px-4 py-2 text-sm font-medium text-amber-800"
                    >
                      Pro $19/mo — 30 days
                    </button>
                  </CreemCheckout>
                )}
                <button
                  type="button"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-500"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    setResult(null);
                    setPreview(null);
                    setRestored(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Free", d: "Watermarked preview — try before you pay" },
            { t: "Credits $9", d: "100 clean MLS-ready exports, no expiry drama" },
            { t: "Pro $19/mo", d: "30 days unlimited clean staging on this browser" },
          ].map((p) => (
            <div
              key={p.t}
              className="rounded-xl border border-stone-200 bg-white px-4 py-4"
            >
              <p className="font-semibold text-stone-900">{p.t}</p>
              <p className="mt-1 text-sm text-stone-600">{p.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <details className="rounded-lg border border-stone-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Can I use these on MLS / Zillow?
            </summary>
            <p className="mt-2 text-sm text-stone-600">
              Clean (paid) exports are for marketing previews. Always follow your
              local MLS disclosure rules for virtual staging.
            </p>
          </details>
          <details className="rounded-lg border border-stone-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              What photos work best?
            </summary>
            <p className="mt-2 text-sm text-stone-600">
              Bright, sharp, mostly empty rooms shot straight-on. Angled or dark
              shots stage worse — same as every staging AI.
            </p>
          </details>
          <details className="rounded-lg border border-stone-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Why is there a watermark?
            </summary>
            <p className="mt-2 text-sm text-stone-600">
              Free tier proves the result. Credits or Pro remove the watermark —
              same freemium model as proven indie tools.
            </p>
          </details>
        </section>

        <p className="mt-10 text-center text-xs text-stone-400">
          StageListing — empty room to listing photo · Payments by Creem
        </p>
      </div>
    </main>
  );
}
