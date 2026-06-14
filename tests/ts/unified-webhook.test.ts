import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FikashopGatewayPaths } from '../../packages/ts/src/gateway';
import {
  extractWebhookInvoiceReference,
  parseUnifiedWebhookEnvelope,
} from '../../packages/ts/src/webhook-verify';
import { createWebhookRouter } from '../../packages/ts/src/webhook-router';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../contracts/fixtures');

describe('gateway paths', () => {
  it('uses invoices prefix for subscriptions', () => {
    expect(FikashopGatewayPaths.subscriptions).toBe('/subscriptions/api/subscriptions/');
    expect(FikashopGatewayPaths.plans).toBe('/subscriptions/api/subscriptions/plans/');
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

  it('createWebhookRouter dispatches subscription.updated', async () => {
    const raw = readFileSync(join(fixturesDir, 'webhook-subscription-updated.json'), 'utf8');
    const envelope = parseUnifiedWebhookEnvelope(JSON.parse(raw));
    expect(envelope).toBeTruthy();
    let seen = false;
    const route = createWebhookRouter({
      'subscription.updated': (obj) => {
        seen = obj.active === true;
      },
    });
    await route(envelope!);
    expect(seen).toBe(true);
  });
});
