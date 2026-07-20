"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();
  const email = params.get("customer_email") || params.get("email") || "";
  const orderId = params.get("order_id") || params.get("checkout_id") || "";
  const planParam = (params.get("plan") || "").toLowerCase();
  const plan = planParam === "pro" ? "pro" : "credits";
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  const info = useMemo(() => ({ orderId, email, plan }), [orderId, email, plan]);

  async function mintUnlock() {
    setStatus("Activating…");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: info.email || "buyer@example.com",
        orderId: info.orderId,
        plan: info.plan,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed");
      return;
    }
    localStorage.setItem("snapshelf_unlock", data.token);
    localStorage.setItem("snapshelf_plan", info.plan);
    setDone(true);
    setStatus(
      info.plan === "pro"
        ? "Pro active for 30 days on this browser. Go home and process again — no watermark."
        : "Credits pack active: 100 clean exports on this browser. Go home and process again."
    );
  }

  useEffect(() => {
    // Auto-activate once when landing from Creem
    if (!done && !status) {
      void mintUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Payment success</h1>
        <p className="mt-2 text-zinc-600">
          {info.plan === "pro"
            ? "SnapShelf Pro — clean exports for 30 days on this browser."
            : "SnapShelf Credits — 100 clean (no-watermark) exports on this browser."}
        </p>
        {info.orderId && (
          <p className="mt-4 text-xs text-zinc-400">Ref: {info.orderId}</p>
        )}
        {!done && (
          <button
            type="button"
            onClick={mintUnlock}
            className="mt-6 rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white"
          >
            Activate clean exports
          </button>
        )}
        {status && <p className="mt-4 text-sm text-zinc-700">{status}</p>}
        <a
          href="/"
          className="mt-8 inline-block text-sm text-emerald-700 underline"
        >
          ← Back to SnapShelf
        </a>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
