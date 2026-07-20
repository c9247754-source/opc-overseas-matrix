"use client";

import { useEffect, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";

type BriefResult = {
  title: string;
  outline: string[];
  bullets: { text: string; page?: number }[];
  watermarked: boolean;
  message: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BriefResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";

  useEffect(() => {
    const t = localStorage.getItem("pagebrief_unlock");
    if (t) setUnlockToken(t);
  }, []);

  async function processPdf() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (unlockToken) fd.append("unlockToken", unlockToken);
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium text-amber-800">PageBrief</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Turn any PDF into a cited one-page brief
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Free daily trial. Subscribe with Creem for longer docs and clean
          export.
        </p>

        <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <input
            type="file"
            accept="application/pdf"
            className="block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={!file || loading}
            onClick={processPdf}
            className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Reading…" : "Generate brief"}
          </button>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-8 border-t pt-6 space-y-4">
              <p className="text-sm text-stone-600">{result.message}</p>
              <h2 className="text-xl font-semibold">{result.title}</h2>
              <div>
                <h3 className="text-sm font-medium text-stone-500">Outline</h3>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {result.outline.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-stone-500">
                  Key points
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {result.bullets.map((b, i) => (
                    <li key={i} className="rounded-lg bg-stone-50 px-3 py-2">
                      {b.text}
                      {b.page != null && (
                        <span className="ml-2 text-xs text-stone-400">
                          p.{b.page}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {result.watermarked && (
                <p className="text-xs text-stone-400">
                  Made with PageBrief — free PDF briefing
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {creditsId && (
                  <CreemCheckout
                    productId={creditsId}
                    successUrl="/success"
                    metadata={{ app: "pagebrief", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white"
                    >
                      Credits $9
                    </button>
                  </CreemCheckout>
                )}
                {proId && (
                  <CreemCheckout
                    productId={proId}
                    successUrl="/success"
                    metadata={{ app: "pagebrief", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-amber-700 px-4 py-2 text-sm text-amber-800"
                    >
                      Pro $19/mo
                    </button>
                  </CreemCheckout>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
