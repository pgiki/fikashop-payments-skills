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
    return client.post(PATHS.walletDeposit, buildDepositPayload(input));
}
export async function listSubscriptions(client) {
    return client.get(PATHS.subscriptions);
}
export async function getSubscriptionPlans(client) {
    return client.get(PATHS.plans);
}
export async function getPlanOptions(client, subscriptionId) {
    return client.get(PATHS.planOptions, { for_subscription: subscriptionId });
}
export async function subscribeToPlan(client, planCostSlug) {
    return client.post(PATHS.subscriptions, { plan_cost_slug: planCostSlug });
}
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
export { PATHS as FikashopGatewayPaths };
//# sourceMappingURL=gateway.js.map