import { Checkout } from "@creem_io/nextjs";

/**
 * Creem official Next.js checkout handler.
 * Client: /api/checkout?product_id=prod_xxx
 * Or use CreemCheckout component pointing at this route.
 */
export const GET = Checkout({
  apiKey: process.env.CREEM_API_KEY!,
  testMode: process.env.CREEM_TEST_MODE !== "false",
  defaultSuccessUrl: "/success",
});
