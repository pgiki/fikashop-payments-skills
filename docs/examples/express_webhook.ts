/**
 * Express example: fikashop payment webhook receiver.
 * npm install express
 * Use express.raw({ type: 'application/json' }) so HMAC matches the raw body.
 */
import { createHash } from 'node:crypto';
import express from 'express';
import {
  FIKASHOP_SIGNATURE_HEADER,
  normalizeWebhookStatus,
  verifyFikashopSignature,
} from '@fikashop/payment-gateway-client';

const app = express();
const SECRET = process.env.BILLING_WEBHOOK_SECRET ?? '';
const seen = new Set<string>();
const payments = new Map<string, string>();

function deriveEventId(payload: Record<string, unknown>, rawBody: Buffer): string {
  for (const key of ['event_id', 'webhook_id', 'delivery_id']) {
    const raw = payload[key];
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  const event = payload.event;
  if (event && typeof event === 'object' && (event as { id?: unknown }).id) {
    return String((event as { id: unknown }).id).trim();
  }
  const invoiceId = String(payload.invoice_id ?? payload.id ?? '').trim();
  const rawStatus = String(payload.status ?? '').trim().toLowerCase();
  const digest = createHash('sha256').update(rawBody).digest('hex');
  return `invoice:${invoiceId}:status:${rawStatus}:sha256:${digest}`;
}

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

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      res.status(400).json({ detail: 'Invalid JSON body' });
      return;
    }

    const invoiceId = String(payload.invoice_id ?? payload.id ?? '').trim();
    const eventId = deriveEventId(payload, rawBody);

    if (!invoiceId) {
      res.status(400).json({ detail: 'invoice_id required' });
      return;
    }
    if (seen.has(eventId)) {
      res.json({ received: true, duplicate: true });
      return;
    }
    seen.add(eventId);

    const normalized = normalizeWebhookStatus(payload.status);
    if (normalized != null) {
      payments.set(invoiceId, normalized);
    }

    res.json({ received: true });
  },
);

app.listen(3000, () => console.log('Webhook listening on :3000'));
