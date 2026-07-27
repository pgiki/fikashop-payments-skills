import { describe, expect, it } from 'vitest';
import {
  FikashopGatewayPaths,
  checkFeatureAccess,
  billFeatureUsage,
  getSubscriptionPlans,
  parsePartnerList,
} from '../../packages/ts/src/gateway';
import type { FikashopClient } from '../../packages/ts/src/client';

describe('gateway', () => {
  it('parsePartnerList reads paginated results', () => {
    const data = {
      results: [
        { id: 1, code: 'shop-a', name: 'Shop A' },
        { id: 2, code: 'shop-b', name: 'Shop B' },
      ],
    };
    expect(parsePartnerList(data)).toHaveLength(2);
    expect(parsePartnerList(data)[0].code).toBe('shop-a');
  });

  it('parsePartnerList accepts bare array', () => {
    expect(parsePartnerList([{ id: 3, code: 'x', name: 'X' }])).toHaveLength(1);
  });
});

describe('gateway subscription paths', () => {
  it('uses subscriptions prefix for core routes', () => {
    expect(FikashopGatewayPaths.subscriptions).toBe('/subscriptions/api/subscriptions/');
    expect(FikashopGatewayPaths.plans).toBe('/subscriptions/api/subscriptions/plans/');
    expect(FikashopGatewayPaths.changePlan).toBe('/subscriptions/api/subscriptions/change-plan/');
  });

  it('builds feature access and bill paths with encoded codes', () => {
    expect(FikashopGatewayPaths.featureAccess('sms_outbound')).toBe(
      '/subscriptions/api/subscriptions/features/sms_outbound/access/',
    );
    expect(FikashopGatewayPaths.featureAccess('partner site')).toBe(
      '/subscriptions/api/subscriptions/features/partner%20site/access/',
    );
    expect(FikashopGatewayPaths.featureBill('partner_site_ai_credits')).toBe(
      '/subscriptions/api/subscriptions/features/partner_site_ai_credits/bill/',
    );
  });

  it('getSubscriptionPlans passes comma-separated tag query', async () => {
    let capturedParams: unknown;
    const client = {
      get: async (_url: string, params?: unknown) => {
        capturedParams = params;
        return { ok: true, data: [] };
      },
    } as unknown as FikashopClient;

    await getSubscriptionPlans(client, { tags: ['enterprise', 'featured'] });
    expect(capturedParams).toEqual({ tags: 'enterprise,featured' });

    await getSubscriptionPlans(client);
    expect(capturedParams).toBeUndefined();
  });

  it('getSubscriptionPlans passes point and includes', async () => {
    let capturedParams: unknown;
    const client = {
      get: async (_url: string, params?: unknown) => {
        capturedParams = params;
        return { ok: true, data: [] };
      },
    } as unknown as FikashopClient;

    await getSubscriptionPlans(client, {
      point: '39.28,-6.82',
      includes: ['subscribed_plan_cost_id'],
    });
    expect(capturedParams).toEqual({
      point: '39.28,-6.82',
      includes: 'subscribed_plan_cost_id',
    });
  });

  it('builds plan detail and usage paths', () => {
    expect(FikashopGatewayPaths.plan('plan-uuid')).toBe(
      '/subscriptions/api/subscriptions/plans/plan-uuid/',
    );
    expect(FikashopGatewayPaths.usageByPlan('plan-uuid')).toBe(
      '/subscriptions/api/subscriptions/usage-by-plan/plan-uuid/',
    );
    expect(FikashopGatewayPaths.usageById('sub-uuid')).toBe(
      '/subscriptions/api/subscriptions/usage-by-id/sub-uuid/',
    );
  });

  it('checkFeatureAccess passes subscription_id and subscribed_partner query params', async () => {
    let capturedParams: unknown;
    const client = {
      get: async (_url: string, params?: unknown) => {
        capturedParams = params;
        return { ok: true, data: { allowed: true } };
      },
    } as unknown as FikashopClient;

    await checkFeatureAccess(client, 'sms_outbound', {
      subscriptionId: 'sub-uuid',
      subscribedPartner: 'shop-a',
      point: '39.28,-6.82',
    });
    expect(capturedParams).toEqual({
      subscription_id: 'sub-uuid',
      subscribed_partner: 'shop-a',
      point: '39.28,-6.82',
    });
  });

  it('billFeatureUsage passes subscribed_partner in request params', async () => {
    let capturedParams: unknown;
    const client = {
      post: async (_url: string, _body: unknown, config?: { params?: unknown }) => {
        capturedParams = config?.params;
        return { ok: true, data: { status: 'recorded' } };
      },
    } as unknown as FikashopClient;

    await billFeatureUsage(client, 'sms_outbound', { subscribedPartner: 42 });
    expect(capturedParams).toEqual({ subscribed_partner: 42 });
  });
});
