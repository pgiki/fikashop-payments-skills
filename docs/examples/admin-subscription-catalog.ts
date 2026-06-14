/**
 * Admin subscription catalog — one-shot setup, incremental edit, and safe delete.
 * Server-only: use FIKASHOP_ADMIN_ACCESS_TOKEN + X-Partner-Id (never in mobile bundles).
 */
import {
  createAdminSubscriptionPlan,
  createFikashopClient,
  deleteAdminPlanCost,
  deleteAdminPlanFeature,
  deleteAdminSubscriptionPlan,
  updateAdminSubscriptionPlan,
} from '@fikashop/payment-gateway-client';

async function manageCatalog() {
  const adminToken = process.env.FIKASHOP_ADMIN_ACCESS_TOKEN;
  const baseUrl = process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app';
  const partnerCode = process.env.FIKASHOP_PARTNER_CODE ?? '';

  if (!adminToken) {
    throw new Error('Set FIKASHOP_ADMIN_ACCESS_TOKEN (dashboard Settings → API keys)');
  }
  if (!partnerCode) {
    throw new Error('Set FIKASHOP_PARTNER_CODE for X-Partner-Id');
  }

  const client = createFikashopClient({
    baseUrl,
    getAccessToken: async () => adminToken,
    partnerId: partnerCode,
  });

  const created = await createAdminSubscriptionPlan(client, {
    slug: 'enterprise',
    plan_name: 'Enterprise',
    tags: ['enterprise'],
    costs: [
      {
        slug: 'enterprise-monthly',
        recurrence_unit: 'month',
        cost: '50000.0000',
        currency: 'TZS',
      },
      {
        slug: 'enterprise-yearly',
        recurrence_unit: 'year',
        cost: '500000.0000',
        currency: 'TZS',
      },
    ],
    features: [
      {
        code: 'sms_outbound',
        feature_type: 'quota',
        quota: 500,
        overage_rate: '0.0500',
      },
    ],
  });

  if (!created.ok || !created.data) {
    throw new Error(created.problem ?? `Create failed (${created.status})`);
  }

  const planId = String(created.data.id);
  const monthlyCostId = created.data.costs?.find((c) => c.slug === 'enterprise-monthly')?.id;

  await updateAdminSubscriptionPlan(client, planId, {
    costs: [{ slug: 'enterprise-monthly', cost: '55000.0000' }],
    features: [{ code: 'sms_outbound', quota: 1000 }],
  });

  if (monthlyCostId) {
    const delCost = await deleteAdminPlanCost(client, String(monthlyCostId));
    if (delCost.status === 409) {
      console.warn('Cost still referenced by subscriptions — keep or migrate subscribers first');
    }
  }

  const featureRow = created.data.features?.[0];
  if (featureRow && 'id' in featureRow && featureRow.id) {
    await deleteAdminPlanFeature(client, String(featureRow.id));
  }

  await deleteAdminSubscriptionPlan(client, planId);
}

manageCatalog().catch(console.error);
