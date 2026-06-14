/**
 * Host webhook endpoint — verify, dedupe, route subscription + payment events.
 * Use with Express/Fastify/Next.js route handlers.
 */
import {
  createWebhookRouter,
  InMemoryUnifiedWebhookHandler,
  processUnifiedWebhook,
} from '@fikashop/payment-gateway-client';

const seenEventIds = new Set<string>();

const handler = {
  isDuplicate(eventId: string) {
    return seenEventIds.has(eventId);
  },
  markReceived(event: { eventId: string }) {
    seenEventIds.add(event.eventId);
  },
  async handleEvent() {
    // Optional audit log — business logic lives in the router below.
  },
};

const router = createWebhookRouter({
  'subscription.updated': async (obj) => {
    if (obj.active === true) {
      // Unlock features for subscription_id
      console.log('subscription active', obj.subscription_id);
    }
  },
  'subscription.past_due': async (obj) => {
    console.log('past due — show recovery UI', obj.unpaid_invoices);
  },
  'wallet.deposit_succeeded': async (obj) => {
    console.log('wallet credited', obj.balance_after, obj.user_id);
  },
  'invoice.payment_succeeded': async (obj) => {
    // Dunning Path B — subscription.updated often follows
    console.log('invoice paid', obj.invoice_uuid, obj.amount_paid);
  },
  'payment.refunded': async (obj) => {
    console.log('refund posted', obj.refund_id, obj.refunded_amount, obj.payment_reference);
    // Reverse entitlements / notify finance
  },
  'payment.failed': async (obj) => {
    console.log('payment failed', obj.failure_message, obj.failure_code);
  },
});

/** Example Express-style handler */
export async function handleFikashopWebhook(req: {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const secret = process.env.FIKASHOP_WEBHOOK_SECRET ?? '';
  const fikashopSignature = String(req.headers['fikashop-signature'] ?? req.headers['Fikashop-Signature'] ?? '');
  const legacySignature = String(req.headers['x-fikachu-signature'] ?? '');

  return processUnifiedWebhook({
    rawBody: req.rawBody,
    fikashopSignature,
    legacySignature,
    secret: secret || null,
    handler,
    router,
  });
}

export { handler, router, seenEventIds };
