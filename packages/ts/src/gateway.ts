import type { FikashopClient } from './client.js';
import type {
  PaginatedResults,
  PartnerSummary,
  PaymentCaptureResponse,
  PaymentFormValues,
  PlanCostSummary,
  PublicInvoice,
  PublicPayInitResponse,
  SubscriptionListResponse,
  SubscriptionPlanCatalogItem,
  SubscriptionTransaction,
  SubscriptionWalletBalanceResponse,
  UserSubscription,
  WalletDepositResponse,
} from './types.js';
import { buildCapturePayload, buildDepositPayload, filterDepositMethods } from './payment-fields.js';

const PATHS = {
  adminPartners: '/shop/api/admin/partners/',
  subscriptions: '/invoices/api/subscriptions/',
  balance: '/invoices/api/subscriptions/balance/',
  walletDeposit: '/invoices/api/subscriptions/wallet-deposit/',
  plans: '/invoices/api/subscriptions/plans/',
  planOptions: '/invoices/api/subscriptions/plan-options/',
  changePlan: '/invoices/api/subscriptions/change-plan/',
  cancel: '/invoices/api/subscriptions/cancel/',
  transactions: '/invoices/api/subscriptions/transactions/',
  paymentMethods: '/invoices/api/subscriptions/payment-methods/',
  invoices: '/invoices/api/invoices/',
  publicInvoice: (uuid: string) => `/invoices/api/public/${uuid}/`,
  publicPay: (uuid: string) => `/invoices/api/public/${uuid}/pay/`,
  processPayment: (reference: string) => `/payments/process/${reference}/`,
} as const;

export function parsePartnerList(data: unknown): PartnerSummary[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as { results?: PartnerSummary[] };
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(data)) return data as PartnerSummary[];
  return [];
}

/** Businesses linked to the authenticated user — use `code` or `id` for X-Partner-Id. */
export async function listUserPartners(client: FikashopClient, params?: Record<string, unknown>) {
  return client.get(PATHS.adminPartners, params);
}

export async function getSubscriptionBalance(client: FikashopClient) {
  return client.get<SubscriptionWalletBalanceResponse>(PATHS.balance);
}

export async function getDepositPaymentMethods(client: FikashopClient) {
  const resp = await getSubscriptionBalance(client);
  if (!resp.ok || !resp.data) return { response: resp, methods: [] as const };
  return { response: resp, methods: filterDepositMethods(resp.data.payment_methods) };
}

export async function walletDeposit(
  client: FikashopClient,
  input: {
    total: string;
    variant: string;
    currency: string;
    description?: string;
    inputFields?: PaymentFormValues;
  },
) {
  return client.post<WalletDepositResponse>(PATHS.walletDeposit, buildDepositPayload(input));
}

export async function listSubscriptions(client: FikashopClient) {
  return client.get<SubscriptionListResponse>(PATHS.subscriptions);
}

export async function getSubscriptionPlans(client: FikashopClient) {
  return client.get<SubscriptionPlanCatalogItem[]>(PATHS.plans);
}

export async function getPlanOptions(client: FikashopClient, subscriptionId: string) {
  return client.get<PlanCostSummary[]>(PATHS.planOptions, { for_subscription: subscriptionId });
}

export async function subscribeToPlan(client: FikashopClient, planCostSlug: string) {
  return client.post<UserSubscription>(PATHS.subscriptions, { plan_cost_slug: planCostSlug });
}

export async function changePlan(
  client: FikashopClient,
  input: {
    subscriptionId: string;
    targetPlanCostSlug: string;
    effectiveMode?: 'immediate' | 'next_cycle';
  },
) {
  return client.post<UserSubscription>(PATHS.changePlan, {
    subscription_id: input.subscriptionId,
    target_plan_cost_slug: input.targetPlanCostSlug,
    effective_mode: input.effectiveMode ?? 'immediate',
  });
}

export async function cancelSubscription(client: FikashopClient, subscriptionId: string) {
  return client.post<UserSubscription>(PATHS.cancel, { subscription_id: subscriptionId });
}

export async function getSubscriptionTransactions(
  client: FikashopClient,
  params?: { page?: number; size?: number },
) {
  return client.get<PaginatedResults<SubscriptionTransaction>>(PATHS.transactions, params);
}

export async function getSubscriptionPaymentMethods(
  client: FikashopClient,
  params?: { exclude_codes?: string },
) {
  return client.get<import('./types.js').PaymentMethod[]>(PATHS.paymentMethods, params);
}

export async function listInvoices(client: FikashopClient, params?: Record<string, unknown>) {
  return client.get(PATHS.invoices, params);
}

export async function getPublicInvoice(client: FikashopClient, uuid: string) {
  return client.get<PublicInvoice>(PATHS.publicInvoice(uuid));
}

export async function initiatePublicPay(client: FikashopClient, uuid: string, paymentMethodCode: string) {
  return client.post<PublicPayInitResponse>(PATHS.publicPay(uuid), {
    payment_method_code: paymentMethodCode,
  });
}

export async function capturePayment(
  client: FikashopClient,
  paymentReference: string,
  inputFields: PaymentFormValues,
) {
  return client.post<PaymentCaptureResponse>(
    PATHS.processPayment(paymentReference),
    buildCapturePayload(inputFields),
  );
}

export { PATHS as FikashopGatewayPaths };
