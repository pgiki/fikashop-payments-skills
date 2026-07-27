import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FIXTURES_DIR = join(import.meta.dirname, '../../contracts/fixtures');

function loadJson(name: string): unknown {
  const raw = readFileSync(join(FIXTURES_DIR, name), 'utf8');
  return JSON.parse(raw);
}

const SUBSCRIPTION_FIXTURE_KEYS: Record<string, string[]> = {
  'subscriptions-list.json': ['balance', 'subscriptions'],
  'subscription-plans.json': [],
  'subscription-plans-filtered-by-tag.json': [],
  'subscription-plan-detail.json': ['id', 'slug', 'costs'],
  'subscription-plans-with-subscribed-cost.json': [],
  'usage-by-plan-response.json': ['id', 'subscription', 'feature_usage'],
  'point-invalid-400.json': ['detail'],
  'subscribe-response.json': ['id', 'active', 'subscription'],
  'subscribe-response-inactive-dunning.json': ['id', 'active', 'unpaid_invoices', 'recovery'],
  'subscribe-request-with-client-reference.json': ['plan_cost_slug', 'client_reference'],
  'subscribe-error-unknown-slug.json': ['plan'],
  'change-plan-request.json': ['subscription_id', 'target_plan_cost_slug'],
  'change-plan-response.json': ['id', 'subscription'],
  'change-plan-error-next-cycle.json': ['detail'],
  'cancel-request.json': ['subscription_id'],
  'cancel-response.json': ['id', 'cancelled'],
  'plan-options-all.json': [],
  'plan-options-for-subscription.json': [],
  'feature-access-allowed.json': ['feature_code', 'allowed'],
  'feature-access-quota-exhausted.json': ['feature_code', 'allowed'],
  'feature-access-no-subscription.json': ['feature_code', 'allowed'],
  'feature-access-not-on-plan.json': ['feature_code', 'allowed'],
  'feature-bill-response.json': ['feature_code', 'status'],
  'feature-bill-overage-charged.json': ['feature_code', 'amount_charged'],
  'feature-bill-insufficient-wallet.json': ['detail'],
  'feature-bill-quota-exceeded.json': ['feature_code'],
  'subscription-transactions-page1.json': ['count', 'results'],
  'subscription-payment-methods.json': [],
  'webhook-wallet-deposit-succeeded.json': ['id', 'type', 'data'],
  'webhook-subscription-created.json': ['id', 'type', 'data'],
  'webhook-subscription-updated.json': ['id', 'type', 'data'],
  'webhook-subscription-cancelled.json': ['id', 'type', 'data'],
  'webhook-subscription-past-due.json': ['id', 'type', 'data'],
  'webhook-payment-succeeded.json': ['id', 'type', 'data'],
  'webhook-payment-failed.json': ['id', 'type', 'data'],
  'webhook-payment-refunded.json': ['id', 'type', 'data'],
  'webhook-invoice-payment-succeeded-dunning.json': ['id', 'type', 'data'],
  'admin-plan-create-full-request.json': ['slug', 'costs', 'features'],
  'admin-plan-create-full-response.json': ['id', 'slug', 'costs', 'features'],
  'admin-plan-create-request.json': ['slug'],
  'admin-plan-patch-request.json': ['costs', 'features'],
  'admin-plan-cost-create-request.json': ['slug'],
  'admin-plan-feature-create-request.json': ['code'],
  'admin-plan-delete-blocked-409.json': ['detail'],
};

describe('subscription fixtures', () => {
  it('all listed fixture files exist and parse as JSON', () => {
    for (const name of Object.keys(SUBSCRIPTION_FIXTURE_KEYS)) {
      expect(() => loadJson(name)).not.toThrow();
    }
  });

  it('fixtures include required top-level keys', () => {
    for (const [name, keys] of Object.entries(SUBSCRIPTION_FIXTURE_KEYS)) {
      const data = loadJson(name) as Record<string, unknown>;
      for (const key of keys) {
        expect(data, `${name} missing ${key}`).toHaveProperty(key);
      }
      if (
        name === 'subscription-plans.json' ||
        name === 'subscription-plans-filtered-by-tag.json' ||
        name === 'subscription-plans-with-subscribed-cost.json' ||
        name === 'subscription-payment-methods.json' ||
        name.startsWith('plan-options')
      ) {
        expect(Array.isArray(data)).toBe(true);
      }
    }
  });

  it('plan catalog fixtures include tags arrays', () => {
    for (const name of ['subscription-plans.json', 'subscription-plans-filtered-by-tag.json']) {
      const plans = loadJson(name) as { tags?: string[] }[];
      expect(plans.length).toBeGreaterThan(0);
      for (const plan of plans) {
        expect(Array.isArray(plan.tags)).toBe(true);
      }
    }
  });

  it('inactive dunning fixture links to shared subscription ids', () => {
    const inactive = loadJson('subscribe-response-inactive-dunning.json') as {
      unpaid_invoices: { uuid: string }[];
    };
    const list = loadJson('subscriptions-list.json') as {
      subscriptions: { id: string }[];
    };
    expect(inactive.unpaid_invoices[0].uuid).toBe('d4e5f6a7-b8c9-0123-def0-234567890123');
    expect(list.subscriptions[0].id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  });

  it('every json fixture in directory is valid JSON', () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      expect(() => loadJson(file)).not.toThrow();
    }
  });
});
