import { describe, expect, it } from 'vitest';
import { AdminSubscriptionPaths } from '../../packages/ts/src/admin-subscriptions';

describe('admin-subscriptions paths', () => {
  it('uses shop admin prefix for catalog routes', () => {
    expect(AdminSubscriptionPaths.plans).toBe('/shop/api/admin/subscription-plans/');
    expect(AdminSubscriptionPaths.planCost('abc')).toBe('/shop/api/admin/plan-costs/abc/');
    expect(AdminSubscriptionPaths.planFeature('pf-1')).toBe('/shop/api/admin/plan-features/pf-1/');
  });

  it('encodes plan id in nested routes', () => {
    expect(AdminSubscriptionPaths.plan('plan/id')).toBe(
      '/shop/api/admin/subscription-plans/plan%2Fid/',
    );
    expect(AdminSubscriptionPaths.planCosts('uuid-here')).toBe(
      '/shop/api/admin/subscription-plans/uuid-here/costs/',
    );
    expect(AdminSubscriptionPaths.planFeatures('uuid-here')).toBe(
      '/shop/api/admin/subscription-plans/uuid-here/features/',
    );
  });
});
