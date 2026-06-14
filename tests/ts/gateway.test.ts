import { describe, expect, it } from 'vitest';
import { FikashopGatewayPaths, parsePartnerList } from '../../packages/ts/src/gateway';

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
});
