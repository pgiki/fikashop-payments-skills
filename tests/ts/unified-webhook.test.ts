import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FikashopGatewayPaths } from '../../packages/ts/src/gateway';
import {
  extractWebhookInvoiceReference,
  parseUnifiedWebhookEnvelope,
} from '../../packages/ts/src/webhook-verify';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../contracts/fixtures');

describe('gateway paths', () => {
  it('uses invoices prefix for subscriptions', () => {
    expect(FikashopGatewayPaths.subscriptions).toBe('/invoices/api/subscriptions/');
    expect(FikashopGatewayPaths.plans).toBe('/invoices/api/subscriptions/plans/');
    expect(FikashopGatewayPaths.processPayment('abc')).toBe('/payments/process/abc/');
  });
});

describe('unified webhook helpers', () => {
  it('parseUnifiedWebhookEnvelope reads fixture', () => {
    const raw = readFileSync(join(fixturesDir, 'webhook-event-envelope.json'), 'utf8');
    const envelope = parseUnifiedWebhookEnvelope(JSON.parse(raw));
    expect(envelope?.type).toBe('payment.succeeded');
    expect(envelope?.id).toMatch(/^evt_/);
    expect(extractWebhookInvoiceReference(envelope!)).toBe('ext-inv-rider-8842');
  });
});
