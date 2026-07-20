import { Webhook } from "@creem_io/nextjs";
import { makeUnlockToken } from "@/lib/unlock";

/**
 * Configure in Creem dashboard:
 * https://your-domain.com/api/webhook/creem
 */
export const POST = Webhook({
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  onCheckoutCompleted: async (event) => {
    const customer = event.customer as { email?: string } | undefined;
    const email = customer?.email || "unknown";
    const secret = process.env.CREEM_API_KEY || "dev-secret";
    const token = makeUnlockToken(email, "facepass", secret);
    // MVP: log token — production: store in DB keyed by email/customer_id
    console.log("[creem] checkout.completed", {
      email,
      unlockHint: token.slice(0, 16) + "...",
    });
  },
});
