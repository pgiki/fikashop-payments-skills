/** Route unified webhook envelopes to typed handlers by `envelope.type`. */
export function createWebhookRouter(handlers) {
    return async function routeWebhook(envelope) {
        const handler = handlers[envelope.type];
        if (!handler)
            return false;
        const obj = envelope.data?.object ?? {};
        await handler(obj, envelope);
        return true;
    };
}
export const WEBHOOK_EVENT_TYPES = [
    'payment.created',
    'payment.processing',
    'payment.succeeded',
    'payment.failed',
    'payment.cancelled',
    'payment.refunded',
    'invoice.created',
    'invoice.updated',
    'invoice.cancelled',
    'invoice.payment_succeeded',
    'invoice.settlement_posted',
    'invoice.settlement_failed',
    'wallet.deposit_succeeded',
    'subscription.created',
    'subscription.updated',
    'subscription.cancelled',
    'subscription.past_due',
];
//# sourceMappingURL=webhook-router.js.map