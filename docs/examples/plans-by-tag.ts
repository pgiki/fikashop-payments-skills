/**
 * Browse subscription plans by tag / location — segmented pricing pages
 * (e.g. enterprise vs SMB) with optional geofence and subscribed cost include.
 */
import {
  createFikashopClient,
  getSubscriptionPlan,
  getSubscriptionPlans,
  getUsageByPlan,
  subscribeToPlan,
} from '@fikashop/payment-gateway-client';

async function subscribeToEnterpriseMonthly(
  accessToken: string,
  partnerCode: string,
  opts?: { point?: string },
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  const resp = await getSubscriptionPlans(client, {
    tags: ['enterprise'],
    point: opts?.point,
    includes: ['subscribed_plan_cost_id'],
  });
  if (!resp.ok || !resp.data?.length) {
    throw new Error('No enterprise plans in catalog');
  }

  const plan = resp.data[0];
  if (plan.subscribed_plan_cost_id) {
    const usage = await getUsageByPlan(client, String(plan.id), { point: opts?.point });
    console.log('Already subscribed', plan.subscribed_plan_cost_id, usage.data?.id);
    return usage.data;
  }

  const detail = await getSubscriptionPlan(client, String(plan.id), {
    point: opts?.point,
    includes: ['subscribed_plan_cost_id'],
  });
  const resolved = detail.data ?? plan;

  const monthly = resolved.costs?.find((c) => c.recurrence_unit === 'month');
  if (!monthly?.slug) {
    throw new Error('No monthly billing option on enterprise plan');
  }

  console.log('Selected plan', resolved.plan_name, 'tags', resolved.tags, 'slug', monthly.slug);

  const sub = await subscribeToPlan(client, monthly.slug, {
    clientReference: 'enterprise-signup',
  });
  return sub.data;
}

export { subscribeToEnterpriseMonthly };
