import { buildCapturePayload, buildDepositPayload, filterDepositMethods } from './payment-fields.js';
import { formatGatewayFailure } from './errors.js';
function idempotencyConfig(idempotencyKey) {
    if (!idempotencyKey?.trim())
        return {};
    return { headers: { 'Idempotency-Key': idempotencyKey.trim() } };
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
export async function listSubscriptions(client) {
    return client.get(PATHS.subscriptions);
}
export async function getSubscriptionPlans(client, options) {
    const tags = options?.tags?.map((t) => t.trim()).filter(Boolean).join(',');
    return client.get(PATHS.plans, tags ? { tags } : undefined);
}
export async function getPlanOptions(client, subscriptionId) {
    return client.get(PATHS.planOptions, { for_subscription: subscriptionId });
}
export async function subscribeToPlan(client, planCostSlug, opts) {
    const body = { plan_cost_slug: planCostSlug };
    if (opts?.clientReference)
        body.client_reference = opts.clientReference;
    if (opts?.metadata && Object.keys(opts.metadata).length > 0)
        body.metadata = opts.metadata;
    return client.post(PATHS.subscriptions, body, idempotencyConfig(opts?.idempotencyKey));
}
/**
 * Change billing option. Only `immediate` is supported — `next_cycle` returns HTTP 400.
 * @deprecated Use `effectiveMode: 'immediate'` only; `next_cycle` is rejected by the API.
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
    const params = opts?.subscriptionId ? { subscription_id: opts.subscriptionId } : undefined;
    return client.get(PATHS.featureAccess(featureCode), params);
}
export async function billFeatureUsage(client, featureCode, opts) {
    const params = opts?.subscriptionId ? { subscription_id: opts.subscriptionId } : undefined;
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