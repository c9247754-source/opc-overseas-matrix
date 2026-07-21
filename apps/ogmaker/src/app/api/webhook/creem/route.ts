import { Webhook } from "@creem_io/nextjs";
import { makeUnlockToken } from "@/lib/unlock";

export const POST = Webhook({
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  onCheckoutCompleted: async (event) => {
    const customer = event.customer as { email?: string } | undefined;
    const meta = event.metadata as { plan?: string } | undefined;
    const email = customer?.email || "unknown";
    const plan = meta?.plan === "pro" ? "pro" : "credits";
    const secret = process.env.CREEM_API_KEY || "dev-secret";
    const token = makeUnlockToken(email, "ogmaker", secret, plan);
    console.log("[creem] ogmaker checkout.completed", {
      email,
      plan,
      unlockHint: token.slice(0, 16) + "...",
    });
  },
});
