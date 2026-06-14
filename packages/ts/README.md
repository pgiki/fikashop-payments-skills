# @fikashop/payment-gateway-client

```bash
npm install && npm test && npm run build
```

API contract: [contracts/SUBSCRIPTIONS.md](../../contracts/SUBSCRIPTIONS.md) · [contracts/REFERENCE.md](../../contracts/REFERENCE.md) · [contracts/PRODUCTION.md](../../contracts/PRODUCTION.md)

## Highlights

| Area | Functions |
|------|-----------|
| Subscriptions | `subscribeToPlan`, `listSubscriptions`, `changePlan`, `cancelSubscription`, `checkFeatureAccess`, `billFeatureUsage` |
| Checkout | `walletDeposit`, `getPublicInvoice`, `initiatePublicPay`, `capturePayment` |
| Async recovery | `pollSubscriptionActive`, `waitForWalletCredit`, `waitForInvoicePaid` |
| Idempotency | Pass `idempotencyKey` on subscribe, deposit, and feature bill |
| Webhooks | `processUnifiedWebhook`, `createWebhookRouter`, `verifyUnifiedFikashopSignature` |
| Errors | `formatGatewayFailure`, `describeGatewayFailure` |

Examples: [docs/examples](../../docs/examples/)
