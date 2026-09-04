/**
 * Subscribe to a plan and top up the wallet when balance is insufficient.
 *
 * This example shows a third-party app subscribing a user to a plan. If the
 * wallet has insufficient funds, it tops up first then retries the subscription.
 *
 * You need: a user OIDC access token, a partner code, and a plan cost slug.
 * The wallet is scoped to the partner via X-Partner-Id.
 *
 * Response status handling for wallet top-up:
 *   "redirect" → open redirect_url in browser
 *   "waiting"  → STK push sent; wait for webhook, then retry subscribe
 *   "success"  → wallet credited; retry subscribe immediately
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

  // 1. Try subscribing — wallet is charged immediately if funded
  const subResp = await subscribeToPlan(client, planCostSlug, { subscribedPartner: partnerCode });
  if (subResp.ok && subResp.data?.active) {
    return { step: 'subscribed' as const, subscription: subResp.data };
  }

  // 2. If inactive with unpaid invoices, the wallet was underfunded
  if (subResp.ok && subResp.data && !subResp.data.active) {
    const dunningUuid = subResp.data.unpaid_invoices?.[0]?.uuid;
    if (dunningUuid) {
      return {
        step: 'inactive_dunning' as const,
        subscription: subResp.data,
        dunningInvoiceUuid: dunningUuid,
        hint: 'Top up wallet (Path A) or pay dunning invoice via public invoice API (Path B)',
      };
    }
  }

  // 3. Top up wallet
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

  // 4. Handle deposit response status
  if (isRedirectStatus(depositResp.data?.status) && depositResp.data?.redirect_url) {
    // Redirect: open URL in browser, then retry subscribe after payment
    return { step: 'redirect' as const, url: depositResp.data.redirect_url };
  }

  if (depositResp.data?.status === 'waiting') {
    // Async: STK push sent — wait for wallet.deposit_succeeded webhook, then retry subscribe
    return {
      step: 'waiting' as const,
      detail: depositResp.data?.detail,
    };
  }

  // 5. Synchronous confirm — wallet credited, retry subscribe immediately
  const retryResp = await subscribeToPlan(client, planCostSlug, { subscribedPartner: partnerCode });
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
