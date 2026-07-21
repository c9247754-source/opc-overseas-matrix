"use client";

import { useEffect, useState } from "react";
import { CreemCheckout } from "@creem_io/nextjs";

type RuleResult = {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

type ComplianceReport = {
  width: number;
  height: number;
  format: string;
  bytes: number;
  score: number;
  ready: boolean;
  rules: RuleResult[];
};

type ProcessResult = {
  report: ComplianceReport;
  reportUrl: string;
  watermarked: boolean;
  message: string;
  creditsLeft?: number;
};

type SavedSession = {
  preview: string | null;
  result: ProcessResult;
};

const SESSION_KEY = "listcheck_last_result";
const UNLOCK_KEY = "listcheck_unlock";

function saveSession(data: SavedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ...data, preview: null })
      );
    } catch {
      /* ignore */
    }
  }
}

function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    if (!parsed?.result?.reportUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function statusClass(s: RuleResult["status"]) {
  if (s === "pass") return "text-emerald-700 bg-emerald-50";
  if (s === "warn") return "text-amber-800 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState("");

  const creditsId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS || "";
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO || "";

  useEffect(() => {
    const t = localStorage.getItem(UNLOCK_KEY);
    if (t) setUnlockToken(t);

    const saved = loadSession();
    if (saved) {
      setPreview(saved.preview);
      setResult(saved.result);
      setRestored(true);
    }
  }, []);

  async function onFileChange(f: File | null) {
    setFile(f);
    setResult(null);
    setRestored(false);
    setError(null);
    clearSession();
    if (!f) {
      setPreview(null);
      return;
    }
    setPreview(await fileToDataUrl(f));
  }

  async function runCheck() {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    setRestored(false);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preview,
          unlockToken: unlockToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      if (data.unlockToken) {
        localStorage.setItem(UNLOCK_KEY, data.unlockToken);
        setUnlockToken(data.unlockToken);
      }
      setResult(data);
      saveSession({ preview, result: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium tracking-wide text-sky-700">
          ListCheck
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Will Amazon suppress this MAIN image?
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Upload before you list. Get pass / warn / fail against common MAIN
          rules — not another background remover.
        </p>

        {unlockToken && (
          <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Clean report unlocked on this browser.
          </p>
        )}

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-700">
            Upload Amazon MAIN candidate
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/tiff"
            className="mt-2 block w-full text-sm"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />

          {preview && !result && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Upload"
              className="mt-4 max-h-64 rounded-lg border border-zinc-100 object-contain"
            />
          )}

          <button
            type="button"
            disabled={!file || loading}
            onClick={runCheck}
            className="mt-6 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Checking…" : "Check MAIN compliance"}
          </button>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {result && (
            <div className="mt-8 border-t border-zinc-100 pt-6">
              {restored && (
                <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  Restored your last report (e.g. after leaving checkout unpaid).
                </p>
              )}

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p
                    className={`text-2xl font-semibold ${
                      result.report.ready ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {result.report.ready
                      ? "No hard fails"
                      : "Fix before MAIN upload"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Score {result.report.score}/100 · {result.report.width}×
                    {result.report.height} · {result.report.format.toUpperCase()}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-600">{result.message}</p>

              <ul className="mt-6 space-y-2">
                {result.report.rules.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-lg px-3 py-3 text-sm ${statusClass(r.status)}`}
                  >
                    <span className="font-semibold uppercase">{r.status}</span>
                    <span className="mx-2 font-medium">{r.title}</span>
                    <p className="mt-1 opacity-90">{r.detail}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {preview && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Your image
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Original"
                      className="max-h-64 w-full rounded-lg border border-zinc-100 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Report card
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.reportUrl}
                    alt="Compliance report"
                    className="max-h-64 w-full rounded-lg border border-zinc-100 bg-white object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={result.reportUrl}
                  download="listcheck-amazon-main-report.png"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm"
                >
                  Download report
                </a>

                {creditsId ? (
                  <CreemCheckout
                    productId={creditsId}
                    checkoutPath="/api/checkout"
                    successUrl="/success?plan=credits"
                    metadata={{ app: "listcheck", plan: "credits" }}
                  >
                    <button
                      type="button"
                      className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Credits $9 — 100 clean reports
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
                    metadata={{ app: "listcheck", plan: "pro" }}
                  >
                    <button
                      type="button"
                      className="rounded-full border border-sky-600 px-4 py-2 text-sm font-medium text-sky-700"
                    >
                      Pro $19/mo — 30 days
                    </button>
                  </CreemCheckout>
                )}

                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-500"
                  onClick={() => {
                    clearSession();
                    setResult(null);
                    setPreview(null);
                    setFile(null);
                    setRestored(false);
                  }}
                >
                  Clear
                </button>
              </div>

              <p className="mt-6 text-xs text-zinc-400">
                Heuristic check against publicly described Amazon MAIN guidance.
                Not affiliated with Amazon. Does not guarantee listing approval.
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          ListCheck — know before you upload · Payments by Creem
        </p>
      </div>
    </main>
  );
}
