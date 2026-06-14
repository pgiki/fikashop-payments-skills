import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  InMemoryUnifiedWebhookHandler,
  processUnifiedWebhook,
} from '../../packages/ts/src/unified-webhook';
import { computeUnifiedFikashopSignature } from '../../packages/ts/src/webhook-verify';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../contracts/fixtures');

describe('processUnifiedWebhook', () => {
  it('verifies signature and dispatches via router', async () => {
    const payload = JSON.parse(readFileSync(join(fixturesDir, 'webhook-payment-refunded.json'), 'utf8'));
    const body = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);
    const sig = computeUnifiedFikashopSignature('test-secret', ts, body);
    const handler = new InMemoryUnifiedWebhookHandler();
    let refundId = '';
    const result = await processUnifiedWebhook({
      rawBody: body,
      fikashopSignature: `t=${ts},v1=${sig}`,
      legacySignature: '',
      secret: 'test-secret',
      handler,
      router: {
        'payment.refunded': (obj) => {
          refundId = String(obj.refund_id ?? '');
        },
      },
    });
    expect(result.statusCode).toBe(200);
    expect(result.body.received).toBe(true);
    expect(refundId).toBe('REF-001');
    expect(handler.events.some(([t]) => t === 'payment.refunded')).toBe(true);
  });

  it('returns duplicate for same event id', async () => {
    const payload = JSON.parse(readFileSync(join(fixturesDir, 'webhook-event-envelope.json'), 'utf8'));
    const body = JSON.stringify(payload);
    const handler = new InMemoryUnifiedWebhookHandler();
    handler.seenEventIds.add(String(payload.id));
    const result = await processUnifiedWebhook({
      rawBody: body,
      secret: null,
      handler,
    });
    expect(result.statusCode).toBe(200);
    expect(result.body.duplicate).toBe(true);
  });
});
