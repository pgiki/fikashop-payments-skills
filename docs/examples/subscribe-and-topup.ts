/**
 * Subscriptions + wallet top-up — typical partner app flow.
 * Subscribe charges the partner-scoped wallet; top up when balance is insufficient.
 */
import {
  createFikashopClient,
  getDepositPaymentMethods,
  getInputFieldsForMethod,
  getSubscriptionPlans,
  isRedirectStatus,
  listSubscriptions,
  subscribeToPlan,
  validateFieldValues,
  walletDeposit,
} from '@fikashop/payment-gateway-client';

async function subscribeWithTopUp(
  accessToken: string,
  partnerCode: string,
  planCostSlug: string,
  topUpAmount: string,
  paymentVariant: string,
  currency = 'TZS',
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  const subResp = await subscribeToPlan(client, planCostSlug);
  if (subResp.ok && subResp.data?.active) {
    return { step: 'subscribed' as const, subscription: subResp.data };
  }

  const { methods } = await getDepositPaymentMethods(client);
  const method = methods.find((m) => m.code === paymentVariant) ?? methods[0];
  if (!method) {
    throw new Error('No deposit payment methods available');
  }

  const fields = getInputFieldsForMethod(method);
  const values: Record<string, string | boolean> = {};
  for (const f of fields) {
    values[f.code] = f.type === 'boolean' || f.type === 'checkbox' ? false : '';
  }
  const errors = validateFieldValues(fields, values);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }

  const depositResp = await walletDeposit(client, {
    total: topUpAmount,
    variant: method.code,
    currency,
    inputFields: values,
  });
  if (!depositResp.ok) {
    throw new Error(depositResp.problem ?? 'Wallet deposit failed');
  }
  if (isRedirectStatus(depositResp.data?.status) && depositResp.data?.redirect_url) {
    return { step: 'redirect' as const, url: depositResp.data.redirect_url };
  }

  const retryResp = await subscribeToPlan(client, planCostSlug);
  if (!retryResp.ok) {
    throw new Error(retryResp.problem ?? 'Subscribe failed after top-up');
  }

  const dashboard = await listSubscriptions(client);
  const plans = await getSubscriptionPlans(client);
  return {
    step: 'subscribed' as const,
    subscription: retryResp.data,
    balance: dashboard.data?.balance,
    planCount: plans.data?.length ?? 0,
  };
}

export { subscribeWithTopUp };
