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
    localStorage.setItem("stagelisting_unlock", data.token);
    localStorage.setItem("stagelisting_plan", info.plan);
    setDone(true);
    setStatus(
      info.plan === "pro"
        ? "Pro active for 30 days. Go home and stage again — no watermark."
        : "Credits active: 100 clean staging exports. Go home and stage again."
    );
  }

  useEffect(() => {
    if (!done && !status) void mintUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-900">
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Payment success</h1>
        <p className="mt-2 text-stone-600">
          {info.plan === "pro"
            ? "StageListing Pro — clean exports for 30 days."
            : "StageListing Credits — 100 clean staging exports."}
        </p>
        {info.orderId && (
          <p className="mt-4 text-xs text-stone-400">Ref: {info.orderId}</p>
        )}
        {!done && (
          <button
            type="button"
            onClick={mintUnlock}
            className="mt-6 rounded-full bg-amber-700 px-5 py-3 text-sm font-medium text-white"
          >
            Activate clean exports
          </button>
        )}
        {status && <p className="mt-4 text-sm text-stone-700">{status}</p>}
        <a
          href="/"
          className="mt-8 inline-block text-sm text-amber-800 underline"
        >
          ← Back to StageListing
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
