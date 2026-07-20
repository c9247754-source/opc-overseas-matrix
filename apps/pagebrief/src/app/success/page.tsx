"use client";

import { Suspense, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const email = params.get("customer_email") || params.get("email") || "";
  const orderId = params.get("order_id") || params.get("checkout_id") || "";
  const [status, setStatus] = useState("");

  const info = useMemo(() => ({ orderId, email }), [orderId, email]);

  async function mintUnlock() {
    setStatus("Requesting unlock…");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: info.email || "buyer@example.com",
        orderId: info.orderId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed");
      return;
    }
    localStorage.setItem("pagebrief_unlock", data.token);
    setStatus("Unlocked. Go home and process again — watermark removed.");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Payment success</h1>
        <p className="mt-2 text-zinc-600">
          Creem payment received. Activate clean exports on this browser
          (MVP). Later: grant via webhook + login.
        </p>
        {info.orderId && (
          <p className="mt-4 text-xs text-zinc-400">Ref: {info.orderId}</p>
        )}
        <button
          type="button"
          onClick={mintUnlock}
          className="mt-6 rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white"
        >
          Activate clean exports
        </button>
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
