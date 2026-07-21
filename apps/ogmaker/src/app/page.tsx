"use client";

import { useEffect, useRef, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";

type OgTemplate = "blog" | "product" | "launch" | "quote";

type ProcessResult = {
  previewUrl: string;
  template: OgTemplate;
  watermarked: boolean;
  message: string;
  creditsLeft?: number;
};

const TEMPLATES: { id: OgTemplate; label: string }[] = [
  { id: "blog", label: "Blog / Article" },
  { id: "product", label: "Product" },
  { id: "launch", label: "Launch" },
  { id: "quote", label: "Quote" },
];

const UNLOCK_KEY = "ogmaker_unlock";

export default function Home() {
  const [template, setTemplate] = useState<OgTemplate>("blog");
  const [title, setTitle] = useState("Ship your next idea this week");
  const [subtitle, setSubtitle] = useState(
    "A free Open Graph image for blogs, launches, and product pages."
  );
  const [accent, setAccent] = useState("#0ea5e9");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockRef = useRef("");

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";
  const brand = process.env.NEXT_PUBLIC_BRAND || "OgMaker";

  useEffect(() => {
    const t = localStorage.getItem(UNLOCK_KEY);
    if (t) {
      setUnlockToken(t);
      unlockRef.current = t;
    }
  }, []);

  useEffect(() => {
    unlockRef.current = unlockToken;
  }, [unlockToken]);

  async function runRender(opts?: { silent?: boolean }) {
    if (!title.trim()) return;
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          title,
          subtitle,
          accent,
          unlockToken: unlockRef.current || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render failed");
      if (data.unlockToken) {
        localStorage.setItem(UNLOCK_KEY, data.unlockToken);
        setUnlockToken(data.unlockToken);
        unlockRef.current = data.unlockToken;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // Live preview like competitor OG tools — debounce as you type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runRender({ silent: true });
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, template, accent]);

  const metaSnippet = result
    ? `<meta property="og:image" content="https://YOUR-DOMAIN/og.png" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />`
    : "";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-sm font-medium tracking-wide text-sky-700">
          OgMaker
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Open Graph images in 10 seconds
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          1200×630 cards for Facebook, X, LinkedIn. Type → live preview →
          download. Free watermarked; pay only when you need a clean export.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            No design tool
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Exact 1200×630
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Live preview as you type
          </span>
        </div>

        {unlockToken && (
          <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Clean export unlocked on this browser.
          </p>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Template
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    template === t.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={120}
            />

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Subtitle
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              maxLength={160}
            />

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Accent color
            </label>
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="mt-2 h-10 w-16 cursor-pointer rounded border border-slate-300 bg-white"
            />

            <button
              type="button"
              disabled={!title.trim() || loading}
              onClick={() => runRender()}
              className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {loading ? "Rendering…" : "Refresh / export ready"}
            </button>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Social card preview
            </p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Link preview · Facebook / X / LinkedIn
              </div>
              {result?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.previewUrl}
                  alt="OG preview"
                  className="aspect-[1200/630] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[1200/630] items-center justify-center bg-slate-100 text-sm text-slate-400">
                  Preview appears as you type…
                </div>
              )}
              <div className="space-y-1 px-3 py-3">
                <p className="truncate text-xs uppercase tracking-wide text-slate-400">
                  yoursite.com
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {title || "Title"}
                </p>
                <p className="line-clamp-2 text-xs text-slate-500">
                  {subtitle || "Subtitle"}
                </p>
              </div>
            </div>

            {result && (
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={result.previewUrl}
                  download={`ogmaker-${result.template}.png`}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
                >
                  Download 1200×630
                </a>
                {creditsId ? (
                  <CreemCheckout
                    productId={creditsId}
                    checkoutPath="/api/checkout"
                    successUrl="/success?plan=credits"
                    metadata={{ app: "ogmaker", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Credits $9 — 100 clean
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
                    metadata={{ app: "ogmaker", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-sky-600 px-4 py-2 text-sm font-medium text-sky-700"
                    >
                      Pro $19/mo
                    </button>
                  </CreemCheckout>
                )}
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Paste into your site
                  </p>
                  <button
                    type="button"
                    className="text-xs text-sky-700 underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(metaSnippet);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? "Copied" : "Copy meta tags"}
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-600">
                  {metaSnippet}
                </pre>
                <p className="mt-2 text-xs text-slate-400">
                  Host the downloaded PNG, then point{" "}
                  <code>og:image</code> at that URL. {brand}.
                </p>
              </div>
            )}
          </div>
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Free", d: "Live preview + watermarked PNG" },
            { t: "Credits $9", d: "100 clean exports, no watermark" },
            { t: "Pro $19/mo", d: "30 days clean exports on this browser" },
          ].map((p) => (
            <div
              key={p.t}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4"
            >
              <p className="font-semibold">{p.t}</p>
              <p className="mt-1 text-sm text-slate-600">{p.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              What size do social networks want?
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              1200×630 is the standard for Facebook, LinkedIn, and X link cards.
              That is what OgMaker exports.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Why watermark on free?
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              So you can validate the design instantly. Credits / Pro remove it
              for production sites.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Do you have a dynamic API?
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              MVP is one-off PNG export (Bannerbear-style start). API comes after
              paid demand shows up.
            </p>
          </details>
        </section>

        <p className="mt-10 text-center text-xs text-slate-400">
          OgMaker — free online OG image generator · Payments by Creem
        </p>
      </div>
    </main>
  );
}
