import { buildCapturePayload, buildDepositPayload, filterDepositMethods } from './payment-fields.js';
import { formatGatewayFailure } from './errors.js';
function idempotencyConfig(idempotencyKey) {
    if (!idempotencyKey?.trim())
        return {};
    return { headers: { 'Idempotency-Key': idempotencyKey.trim() } };
}
function featureQueryParams(opts) {
    const params = {};
    if (opts?.subscriptionId)
        params.subscription_id = opts.subscriptionId;
    if (opts?.subscribedPartner != null && opts.subscribedPartner !== '') {
        params.subscribed_partner = opts.subscribedPartner;
    }
    if (opts?.point?.trim())
        params.point = opts.point.trim();
    return Object.keys(params).length > 0 ? params : undefined;
}
function catalogQueryParams(options) {
    const params = {};
    const tags = options?.tags?.map((t) => t.trim()).filter(Boolean).join(',');
    if (tags)
        params.tags = tags;
    if (options?.point?.trim())
        params.point = options.point.trim();
    const includes = options?.includes?.map((i) => i.trim()).filter(Boolean).join(',');
    if (includes)
        params.includes = includes;
    return Object.keys(params).length > 0 ? params : undefined;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const PATHS = {
    adminPartners: '/shop/api/admin/partners/',
    subscriptions: '/subscriptions/api/subscriptions/',
    balance: '/subscriptions/api/subscriptions/balance/',
    walletDeposit: '/subscriptions/api/subscriptions/wallet-deposit/',
    plans: '/subscriptions/api/subscriptions/plans/',
    plan: (planId) => `/subscriptions/api/subscriptions/plans/${encodeURIComponent(planId)}/`,
    usageByPlan: (planId) => `/subscriptions/api/subscriptions/usage-by-plan/${encodeURIComponent(planId)}/`,
    usageById: (subscriptionId) => `/subscriptions/api/subscriptions/usage-by-id/${encodeURIComponent(subscriptionId)}/`,
    planOptions: '/subscriptions/api/subscriptions/plan-options/',
    changePlan: '/subscriptions/api/subscriptions/change-plan/',
    cancel: '/subscriptions/api/subscriptions/cancel/',
    transactions: '/subscriptions/api/subscriptions/transactions/',
    paymentMethods: '/subscriptions/api/subscriptions/payment-methods/',
    featureAccess: (code) => `/subscriptions/api/subscriptions/features/${encodeURIComponent(code)}/access/`,
    featureBill: (code) => `/subscriptions/api/subscriptions/features/${encodeURIComponent(code)}/bill/`,
    invoices: '/invoices/api/invoices/',
    publicInvoice: (uuid) => `/invoices/api/public/${uuid}/`,
    publicPay: (uuid) => `/invoices/api/public/${uuid}/pay/`,
    processPayment: (reference) => `/payments/process/${reference}/`,
};
export function parsePartnerList(data) {
    if (!data || typeof data !== 'object')
        return [];
    const d = data;
    if (Array.isArray(d.results))
        return d.results;
    if (Array.isArray(data))
        return data;
    return [];
}
/** Businesses linked to the authenticated user — use `code` or `id` for X-Partner-Id. */
export async function listUserPartners(client, params) {
    return client.get(PATHS.adminPartners, params);
}
export async function getSubscriptionBalance(client) {
    return client.get(PATHS.balance);
}
export async function getDepositPaymentMethods(client) {
    const resp = await getSubscriptionBalance(client);
    if (!resp.ok || !resp.data)
        return { response: resp, methods: [] };
    return { response: resp, methods: filterDepositMethods(resp.data.payment_methods) };
}
export async function walletDeposit(client, input) {
    return client.post(PATHS.walletDeposit, buildDepositPayload(input), idempotencyConfig(input.idempotencyKey));
}
export async function listSubscriptions(client, options) {
    const params = {};
    const tags = options?.tags?.map((t) => t.trim()).filter(Boolean).join(',');
    if (tags)
        params.tags = tags;
    if (options?.point?.trim())
        params.point = options.point.trim();
    if (options?.page != null)
        params.page = options.page;
    if (options?.size != null)
        params.size = options.size;
    return client.get(PATHS.subscriptions, Object.keys(params).length > 0 ? params : undefined);
}
export async function getSubscriptionPlans(client, options) {
    return client.get(PATHS.plans, catalogQueryParams(options));
}
export async function getSubscriptionPlan(client, planId, options) {
    return client.get(PATHS.plan(planId), catalogQueryParams(options));
}
export async function getUsageByPlan(client, planId, options) {
    return client.get(PATHS.usageByPlan(planId), options?.point?.trim() ? { point: options.point.trim() } : undefined);
}
export async function getUsageById(client, subscriptionId) {
    return client.get(PATHS.usageById(subscriptionId));
}
export async function getPlanOptions(client, subscriptionId, options) {
    const params = { for_subscription: subscriptionId };
    if (options?.point?.trim())
        params.point = options.point.trim();
    return client.get(PATHS.planOptions, params);
}
export async function subscribeToPlan(client, planCostSlug, opts) {
    const body = { plan_cost_slug: planCostSlug };
    if (opts?.subscribedPartner != null && opts.subscribedPartner !== '') {
        body.subscribed_partner = opts.subscribedPartner;
    }
    if (opts?.clientReference)
        body.client_reference = opts.clientReference;
    if (opts?.metadata && Object.keys(opts.metadata).length > 0)
        body.metadata = opts.metadata;
    return client.post(PATHS.subscriptions, body, idempotencyConfig(opts?.idempotencyKey));
}
/**
 * Change plan cost.
 * - `immediate` — unused-time credit + charge full new plan + restart billing dates (402 if underfunded)
 * - `next_cycle` — keep current plan; schedule pending until renewal
 */
export async function changePlan(client, input) {
    return client.post(PATHS.changePlan, {
        subscription_id: input.subscriptionId,
        target_plan_cost_slug: input.targetPlanCostSlug,
        effective_mode: input.effectiveMode ?? 'immediate',
    });
}
export async function cancelSubscription(client, subscriptionId) {
    return client.post(PATHS.cancel, { subscription_id: subscriptionId });
}
export async function getSubscriptionTransactions(client, params) {
    return client.get(PATHS.transactions, params);
}
export async function getSubscriptionPaymentMethods(client, params) {
    return client.get(PATHS.paymentMethods, params);
}
export async function checkFeatureAccess(client, featureCode, opts) {
    return client.get(PATHS.featureAccess(featureCode), featureQueryParams(opts));
}
export async function billFeatureUsage(client, featureCode, opts) {
    const params = featureQueryParams(opts);
    return client.post(PATHS.featureBill(featureCode), { quantity: opts?.quantity ?? 1 }, { ...idempotencyConfig(opts?.idempotencyKey), ...(params ? { params } : {}) });
}
export async function listInvoices(client, params) {
    return client.get(PATHS.invoices, params);
}
export async function getPublicInvoice(client, uuid) {
    return client.get(PATHS.publicInvoice(uuid));
}
export async function initiatePublicPay(client, uuid, paymentMethodCode) {
    return client.post(PATHS.publicPay(uuid), {
        payment_method_code: paymentMethodCode,
    });
}
export async function capturePayment(client, paymentReference, inputFields) {
    return client.post(PATHS.processPayment(paymentReference), buildCapturePayload(inputFields));
}
/** Poll until a subscription becomes active (e.g. after wallet top-up + Celery retry). */
export async function pollSubscriptionActive(client, opts) {
    const maxAttempts = opts?.maxAttempts ?? 12;
    const intervalMs = opts?.intervalMs ?? 5000;
    for (let i = 0; i < maxAttempts; i += 1) {
        const resp = await listSubscriptions(client);
        const subs = resp.data?.subscriptions ?? [];
        const match = opts?.subscriptionId
            ? subs.find((s) => s.id === opts.subscriptionId && s.active)
            : subs.find((s) => s.active);
        if (match)
            return match;
        if (i < maxAttempts - 1)
            await sleep(intervalMs);
    }
    return null;
}
/** Poll wallet balance until it reaches at least `minBalance`. */
export async function waitForWalletCredit(client, minBalance, opts) {
    const target = Number(minBalance);
    const maxAttempts = opts?.maxAttempts ?? 12;
    const intervalMs = opts?.intervalMs ?? 5000;
    for (let i = 0; i < maxAttempts; i += 1) {
        const resp = await getSubscriptionBalance(client);
        const balance = Number(resp.data?.balance ?? 0);
        if (Number.isFinite(target) && balance >= target) {
            return String(resp.data?.balance ?? balance);
        }
        if (i < maxAttempts - 1)
            await sleep(intervalMs);
    }
    return null;
}
/** Poll public invoice until paid (Checkout B confirmation or dunning recovery). */
export async function waitForInvoicePaid(client, invoiceUuid, opts) {
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
        if (i < maxAttempts - 1)
            await sleep(intervalMs);
    }
    return null;
}
/** Human-readable message when a gateway helper response is not ok. */
export function describeGatewayFailure(resp, context) {
    return formatGatewayFailure(resp, context ?? 'auto');
}
export { PATHS as FikashopGatewayPaths };
//# sourceMappingURL=gateway.js.map