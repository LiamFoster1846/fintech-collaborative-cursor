import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.ts";

export const paymentRequest = z.object({
  sessionId: z.string().min(1),
  accountId: z.string().min(1),
  documentId: z.string().min(1),
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  cursor: z.object({ userId: z.string().min(1), line: z.number().int().nonnegative(), column: z.number().int().nonnegative() })
});
export type PaymentRequest = z.infer<typeof paymentRequest>;

export function riskDecision(payment: Pick<PaymentRequest, "amount" | "currency">): "review" | "allow" {
  return payment.amount >= 10000 || payment.currency !== "USD" ? "review" : "allow";
}

export async function publishPaymentReview(input: PaymentRequest, client = new InfraiRealtime(process.env.INFRAI_API_KEY ?? "")) {
  const parsed = paymentRequest.parse(input);
  const channel = `payment-editor-${parsed.documentId}`;
  await client.infrai.auth.session.verify(parsed.sessionId);
  await client.infrai.realtime.channel.create({ channel, type: "private", vendor: "realtime" });
  const token = await client.infrai.realtime.token.issue({
    client_id: parsed.cursor.userId,
    channels: [channel],
    capabilities: ["publish", "presence"],
    ttl_seconds: 3600
  });
  const decision = riskDecision(parsed);
  await client.infrai.realtime.publish({
    channel,
    event: "payment.reviewed",
    account_id: parsed.accountId,
    data: { payment_id: parsed.paymentId, amount: parsed.amount, currency: parsed.currency, decision, cursor: parsed.cursor }
  });
  return { channel, decision, token };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input: PaymentRequest = {
    sessionId: process.env.DEMO_SESSION_ID ?? "session-from-your-editor",
    accountId: process.env.DEMO_ACCOUNT_ID ?? "account-demo",
    documentId: process.env.DEMO_DOCUMENT_ID ?? "invoice-2026-001",
    paymentId: process.env.DEMO_PAYMENT_ID ?? "payment-2026-001",
    amount: Number(process.env.DEMO_AMOUNT ?? "1250"),
    currency: process.env.DEMO_CURRENCY ?? "USD",
    cursor: { userId: process.env.DEMO_USER_ID ?? "reviewer-1", line: 18, column: 7 }
  };
  publishPaymentReview(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
