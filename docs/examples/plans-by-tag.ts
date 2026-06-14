/**
 * Browse subscription plans by tag — useful for segmented pricing pages
 * (e.g. enterprise vs SMB). Tags are assigned in Django admin; filter with AND semantics.
 */
import {
  createFikashopClient,
  getSubscriptionPlans,
  subscribeToPlan,
} from '@fikashop/payment-gateway-client';

async function subscribeToEnterpriseMonthly(
  accessToken: string,
  partnerCode: string,
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  const resp = await getSubscriptionPlans(client, { tags: ['enterprise'] });
  if (!resp.ok || !resp.data?.length) {
    throw new Error('No enterprise plans in catalog');
  }

  const plan = resp.data[0];
  const monthly = plan.costs?.find((c) => c.recurrence_unit === 'month');
  if (!monthly?.slug) {
    throw new Error('No monthly billing option on enterprise plan');
  }

  console.log('Selected plan', plan.plan_name, 'tags', plan.tags, 'slug', monthly.slug);

  const sub = await subscribeToPlan(client, monthly.slug, {
    clientReference: 'enterprise-signup',
  });
  return sub.data;
}

export { subscribeToEnterpriseMonthly };
