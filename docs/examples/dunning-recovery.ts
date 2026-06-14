/**
 * Dunning recovery — subscribe returns inactive with unpaid_invoices[].
 * Path A: wallet top-up + poll/webhook. Path B: pay dunning invoice via Checkout B.
 *
 * Uses end-user OIDC token only (never FIKASHOP_ADMIN_ACCESS_TOKEN).
 */
import {
  capturePayment,
  createFikashopClient,
  defaultFieldValues,
  getDepositPaymentMethods,
  getInputFieldsForMethod,
  getPublicInvoice,
  initiatePublicPay,
  isRedirectStatus,
  pollSubscriptionActive,
  subscribeToPlan,
  validateFieldValues,
  walletDeposit,
  type UnpaidInvoiceSummary,
  type UserSubscription,
} from '@fikashop/payment-gateway-client';

type RecoveryPath = 'already_active' | 'wallet_topup' | 'pay_dunning_invoice' | 'redirect';

async function recoverAfterSubscribe(
  accessToken: string,
  partnerCode: string,
  planCostSlug: string,
  opts?: {
    preferInvoicePay?: boolean;
    topUpAmount?: string;
    paymentVariant?: string;
    currency?: string;
    subscriptionId?: string;
    idempotencyKey?: string;
  },
): Promise<{
  path: RecoveryPath;
  subscription?: UserSubscription;
  redirectUrl?: string;
  dunningInvoice?: UnpaidInvoiceSummary;
}> {
  const baseUrl = process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app';
  const client = createFikashopClient({
    baseUrl,
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(baseUrl, partnerCode);

  const subResp = await subscribeToPlan(client, planCostSlug, {
    idempotencyKey: opts?.idempotencyKey,
  });
  if (!subResp.ok || !subResp.data) {
    throw new Error(subResp.problem ?? 'Subscribe failed');
  }

  if (subResp.data.active) {
    return { path: 'already_active', subscription: subResp.data };
  }

  const dunning = subResp.data.unpaid_invoices?.[0];
  const subscriptionId = opts?.subscriptionId ?? subResp.data.id;

  if (opts?.preferInvoicePay && dunning?.uuid) {
    return payDunningInvoice(client, dunning, subscriptionId);
  }

  return topUpAndPoll(
    client,
    subscriptionId,
    opts?.topUpAmount,
    opts?.paymentVariant,
    opts?.currency,
  );
}

async function topUpAndPoll(
  client: ReturnType<typeof createFikashopClient>,
  subscriptionId: string,
  topUpAmount = '20000.00',
  paymentVariant?: string,
  currency = 'TZS',
) {
  const { methods } = await getDepositPaymentMethods(client);
  const method = methods.find((m) => m.code === paymentVariant) ?? methods[0];
  if (!method) {
    throw new Error('No deposit payment methods available');
  }

  const fields = getInputFieldsForMethod(method);
  const values = defaultFieldValues(fields);
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

  if (isRedirectStatus(depositResp.data?.status) && depositResp.data?.redirect_url) {
    return { path: 'redirect' as const, redirectUrl: depositResp.data.redirect_url };
  }

  // Path A: Celery retries billing ~1 min; poll or wait for wallet.deposit_succeeded webhook
  const active = await pollSubscriptionActive(client, {
    subscriptionId,
    maxAttempts: 15,
    intervalMs: 5000,
  });

  return { path: 'wallet_topup' as const, subscription: active ?? undefined };
}

async function payDunningInvoice(
  client: ReturnType<typeof createFikashopClient>,
  dunning: UnpaidInvoiceSummary,
  subscriptionId?: string,
) {
  const invoiceResp = await getPublicInvoice(client, dunning.uuid);
  if (!invoiceResp.ok || !invoiceResp.data) {
    throw new Error(invoiceResp.problem ?? 'Failed to load dunning invoice');
  }
  if (invoiceResp.data.public_pay_blocked) {
    throw new Error('Dunning invoice cannot be paid online');
  }

  const methods = invoiceResp.data.payment_methods ?? [];
  const method = methods.find((m) => m.code !== 'wallet') ?? methods[0];
  if (!method) {
    throw new Error('No payment methods on dunning invoice');
  }

  const payResp = await initiatePublicPay(client, dunning.uuid, method.code);
  if (!payResp.ok || !payResp.data?.payment_reference) {
    throw new Error(payResp.problem ?? 'Pay init failed');
  }

  const fields = getInputFieldsForMethod(method);
  const values = defaultFieldValues(fields);
  const captureResp = await capturePayment(client, payResp.data.payment_reference, values);

  if (isRedirectStatus(captureResp.data?.status) && captureResp.data?.redirect_url) {
    return {
      path: 'redirect' as const,
      redirectUrl: captureResp.data.redirect_url,
      dunningInvoice: dunning,
    };
  }

  const active = subscriptionId
    ? await pollSubscriptionActive(client, { subscriptionId, maxAttempts: 12, intervalMs: 5000 })
    : null;

  return {
    path: 'pay_dunning_invoice' as const,
    subscription: active ?? undefined,
    dunningInvoice: dunning,
  };
}

export { payDunningInvoice, recoverAfterSubscribe, topUpAndPoll };
