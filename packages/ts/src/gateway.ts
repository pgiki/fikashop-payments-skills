import type { FikashopClient } from './client.js';
import type {
  FeatureAccessResponse,
  FeatureBillResponse,
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
import { formatGatewayFailure } from './errors.js';
import type { ApiResponse } from 'apisauce';

function idempotencyConfig(idempotencyKey?: string) {
  if (!idempotencyKey?.trim()) return {};
  return { headers: { 'Idempotency-Key': idempotencyKey.trim() } };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PATHS = {
  adminPartners: '/shop/api/admin/partners/',
  subscriptions: '/subscriptions/api/subscriptions/',
  balance: '/subscriptions/api/subscriptions/balance/',
  walletDeposit: '/subscriptions/api/subscriptions/wallet-deposit/',
  plans: '/subscriptions/api/subscriptions/plans/',
  planOptions: '/subscriptions/api/subscriptions/plan-options/',
  changePlan: '/subscriptions/api/subscriptions/change-plan/',
  cancel: '/subscriptions/api/subscriptions/cancel/',
  transactions: '/subscriptions/api/subscriptions/transactions/',
  paymentMethods: '/subscriptions/api/subscriptions/payment-methods/',
  featureAccess: (code: string) => `/subscriptions/api/subscriptions/features/${encodeURIComponent(code)}/access/`,
  featureBill: (code: string) => `/subscriptions/api/subscriptions/features/${encodeURIComponent(code)}/bill/`,
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
    idempotencyKey?: string;
  },
) {
  return client.post<WalletDepositResponse>(
    PATHS.walletDeposit,
    buildDepositPayload(input),
    idempotencyConfig(input.idempotencyKey),
  );
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

export async function subscribeToPlan(
  client: FikashopClient,
  planCostSlug: string,
  opts?: {
    clientReference?: string;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  },
) {
  const body: Record<string, unknown> = { plan_cost_slug: planCostSlug };
  if (opts?.clientReference) body.client_reference = opts.clientReference;
  if (opts?.metadata && Object.keys(opts.metadata).length > 0) body.metadata = opts.metadata;
  return client.post<UserSubscription>(PATHS.subscriptions, body, idempotencyConfig(opts?.idempotencyKey));
}

/**
 * Change billing option. Only `immediate` is supported — `next_cycle` returns HTTP 400.
 * @deprecated Use `effectiveMode: 'immediate'` only; `next_cycle` is rejected by the API.
 */
export async function changePlan(
  client: FikashopClient,
  input: {
    subscriptionId: string;
    targetPlanCostSlug: string;
    /** @deprecated `next_cycle` returns HTTP 400 from the API */
    effectiveMode?: 'immediate';
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

export async function checkFeatureAccess(
  client: FikashopClient,
  featureCode: string,
  opts?: { subscriptionId?: string },
) {
  const params = opts?.subscriptionId ? { subscription_id: opts.subscriptionId } : undefined;
  return client.get<FeatureAccessResponse>(PATHS.featureAccess(featureCode), params);
}

export async function billFeatureUsage(
  client: FikashopClient,
  featureCode: string,
  opts?: { quantity?: number; subscriptionId?: string; idempotencyKey?: string },
) {
  const params = opts?.subscriptionId ? { subscription_id: opts.subscriptionId } : undefined;
  return client.post<FeatureBillResponse>(
    PATHS.featureBill(featureCode),
    { quantity: opts?.quantity ?? 1 },
    { ...idempotencyConfig(opts?.idempotencyKey), ...(params ? { params } : {}) },
  );
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

/** Poll until a subscription becomes active (e.g. after wallet top-up + Celery retry). */
export async function pollSubscriptionActive(
  client: FikashopClient,
  opts?: { subscriptionId?: string; maxAttempts?: number; intervalMs?: number },
): Promise<UserSubscription | null> {
  const maxAttempts = opts?.maxAttempts ?? 12;
  const intervalMs = opts?.intervalMs ?? 5000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const resp = await listSubscriptions(client);
    const subs = resp.data?.subscriptions ?? [];
    const match = opts?.subscriptionId
      ? subs.find((s) => s.id === opts.subscriptionId && s.active)
      : subs.find((s) => s.active);
    if (match) return match;
    if (i < maxAttempts - 1) await sleep(intervalMs);
  }
  return null;
}

/** Poll wallet balance until it reaches at least `minBalance`. */
export async function waitForWalletCredit(
  client: FikashopClient,
  minBalance: string | number,
  opts?: { maxAttempts?: number; intervalMs?: number },
): Promise<string | null> {
  const target = Number(minBalance);
  const maxAttempts = opts?.maxAttempts ?? 12;
  const intervalMs = opts?.intervalMs ?? 5000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const resp = await getSubscriptionBalance(client);
    const balance = Number(resp.data?.balance ?? 0);
    if (Number.isFinite(target) && balance >= target) {
      return String(resp.data?.balance ?? balance);
    }
    if (i < maxAttempts - 1) await sleep(intervalMs);
  }
  return null;
}

/** Poll public invoice until paid (Checkout B confirmation or dunning recovery). */
export async function waitForInvoicePaid(
  client: FikashopClient,
  invoiceUuid: string,
  opts?: { maxAttempts?: number; intervalMs?: number },
): Promise<PublicInvoice | null> {
  const paidStatuses = new Set(['paid', 'settled', 'success', 'confirmed']);
  const maxAttempts = opts?.maxAttempts ?? 12;
  const intervalMs = opts?.intervalMs ?? 5000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const resp = await getPublicInvoice(client, invoiceUuid);
    const status = String(resp.data?.status ?? '')
      .trim()
      .toLowerCase();
    if (resp.ok && paidStatuses.has(status)) {
      return resp.data ?? null;
    }
    if (i < maxAttempts - 1) await sleep(intervalMs);
  }
  return null;
}

/** Human-readable message when a gateway helper response is not ok. */
export function describeGatewayFailure(
  resp: ApiResponse<unknown>,
  context?: import('./errors.js').GatewayFailureContext,
): string {
  return formatGatewayFailure(resp, context ?? 'auto');
}

export { PATHS as FikashopGatewayPaths };
