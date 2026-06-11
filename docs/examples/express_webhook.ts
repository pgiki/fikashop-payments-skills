/**
 * Express example: fikashop payment webhook receiver.
 * npm install express
 * Use express.raw({ type: 'application/json' }) so HMAC matches the raw body.
 */
import express from 'express';
import { verifyFikashopSignature, FIKASHOP_SIGNATURE_HEADER } from '@fikashop/payment-gateway-client';

const app = express();
const SECRET = process.env.BILLING_WEBHOOK_SECRET ?? '';
const seen = new Set<string>();

app.post(
  '/billing/v1/webhooks/fikashop',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body as Buffer;
    const sig = String(req.headers[FIKASHOP_SIGNATURE_HEADER.toLowerCase()] ?? '');

    if (SECRET && !verifyFikashopSignature(SECRET, rawBody, sig)) {
      res.status(403).json({
        detail: sig ? 'Invalid webhook signature.' : 'Missing webhook signature.',
      });
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    const invoiceId = String(payload.invoice_id ?? payload.id ?? '').trim();
    const eventId = String(payload.event_id ?? `invoice:${invoiceId}:${payload.status}`);

    if (!invoiceId) {
      res.status(400).json({ detail: 'invoice_id required' });
      return;
    }
    if (seen.has(eventId)) {
      res.json({ received: true, duplicate: true });
      return;
    }
    seen.add(eventId);
    // TODO: update your payment record by invoiceId
    res.json({ received: true });
  },
);

app.listen(3000, () => console.log('Webhook listening on :3000'));
