import type { FikashopClient } from './client.js';
import type { FeatureAccessResponse, FeatureBillResponse, PaginatedResults, PartnerSummary, PaymentCaptureResponse, PaymentFormValues, PlanCostSummary, PublicInvoice, PublicPayInitResponse, SubscriptionListResponse, SubscriptionPlanCatalogItem, SubscriptionTransaction, SubscriptionWalletBalanceResponse, UserSubscription, WalletDepositResponse } from './types.js';
import type { ApiResponse } from 'apisauce';
declare const PATHS: {
    readonly adminPartners: "/shop/api/admin/partners/";
    readonly subscriptions: "/subscriptions/api/subscriptions/";
    readonly balance: "/subscriptions/api/subscriptions/balance/";
    readonly walletDeposit: "/subscriptions/api/subscriptions/wallet-deposit/";
    readonly plans: "/subscriptions/api/subscriptions/plans/";
    readonly plan: (planId: string) => string;
    readonly usageByPlan: (planId: string) => string;
    readonly usageById: (subscriptionId: string) => string;
    readonly planOptions: "/subscriptions/api/subscriptions/plan-options/";
    readonly changePlan: "/subscriptions/api/subscriptions/change-plan/";
    readonly cancel: "/subscriptions/api/subscriptions/cancel/";
    readonly transactions: "/subscriptions/api/subscriptions/transactions/";
    readonly paymentMethods: "/subscriptions/api/subscriptions/payment-methods/";
    readonly featureAccess: (code: string) => string;
    readonly featureBill: (code: string) => string;
    readonly invoices: "/invoices/api/invoices/";
    readonly publicInvoice: (uuid: string) => string;
    readonly publicPay: (uuid: string) => string;
    readonly processPayment: (reference: string) => string;
};
export declare function parsePartnerList(data: unknown): PartnerSummary[];
/** Businesses linked to the authenticated user — use `code` or `id` for X-Partner-Id. */
export declare function listUserPartners(client: FikashopClient, params?: Record<string, unknown>): Promise<ApiResponse<unknown, unknown>>;
export declare function getSubscriptionBalance(client: FikashopClient): Promise<ApiResponse<SubscriptionWalletBalanceResponse, SubscriptionWalletBalanceResponse>>;
export declare function getDepositPaymentMethods(client: FikashopClient): Promise<{
    response: ApiResponse<SubscriptionWalletBalanceResponse, SubscriptionWalletBalanceResponse>;
    methods: readonly [];
} | {
    response: import("apisauce").ApiOkResponse<SubscriptionWalletBalanceResponse>;
    methods: import("./types.js").PaymentMethod[];
}>;
export declare function walletDeposit(client: FikashopClient, input: {
    total: string;
    variant: string;
    currency: string;
    description?: string;
    inputFields?: PaymentFormValues;
    idempotencyKey?: string;
}): Promise<ApiResponse<WalletDepositResponse, WalletDepositResponse>>;
export declare function listSubscriptions(client: FikashopClient): Promise<ApiResponse<SubscriptionListResponse, SubscriptionListResponse>>;
export declare function getSubscriptionPlans(client: FikashopClient, options?: {
    tags?: string[];
    point?: string;
    includes?: string[];
}): Promise<ApiResponse<SubscriptionPlanCatalogItem[], SubscriptionPlanCatalogItem[]>>;
export declare function getSubscriptionPlan(client: FikashopClient, planId: string, options?: {
    point?: string;
    includes?: string[];
}): Promise<ApiResponse<SubscriptionPlanCatalogItem, SubscriptionPlanCatalogItem>>;
export declare function getUsageByPlan(client: FikashopClient, planId: string, options?: {
    point?: string;
}): Promise<ApiResponse<UserSubscription, UserSubscription>>;
export declare function getUsageById(client: FikashopClient, subscriptionId: string): Promise<ApiResponse<UserSubscription, UserSubscription>>;
export declare function getPlanOptions(client: FikashopClient, subscriptionId: string, options?: {
    point?: string;
}): Promise<ApiResponse<PlanCostSummary[], PlanCostSummary[]>>;
export declare function subscribeToPlan(client: FikashopClient, planCostSlug: string, opts?: {
    /** Subscribed partner — integer PK or string code */
    subscribedPartner?: number | string;
    clientReference?: string;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
}): Promise<ApiResponse<UserSubscription, UserSubscription>>;
/**
 * Change plan cost.
 * - `immediate` — unused-time credit + charge full new plan + restart billing dates (402 if underfunded)
 * - `next_cycle` — keep current plan; schedule pending until renewal
 */
export declare function changePlan(client: FikashopClient, input: {
    subscriptionId: string;
    targetPlanCostSlug: string;
    effectiveMode?: 'immediate' | 'next_cycle';
}): Promise<ApiResponse<UserSubscription, UserSubscription>>;
export declare function cancelSubscription(client: FikashopClient, subscriptionId: string): Promise<ApiResponse<UserSubscription, UserSubscription>>;
export declare function getSubscriptionTransactions(client: FikashopClient, params?: {
    page?: number;
    size?: number;
}): Promise<ApiResponse<PaginatedResults<SubscriptionTransaction>, PaginatedResults<SubscriptionTransaction>>>;
export declare function getSubscriptionPaymentMethods(client: FikashopClient, params?: {
    exclude_codes?: string;
}): Promise<ApiResponse<import("./types.js").PaymentMethod[], import("./types.js").PaymentMethod[]>>;
export declare function checkFeatureAccess(client: FikashopClient, featureCode: string, opts?: {
    subscriptionId?: string;
    /** Subscribed partner — integer PK or string code */
    subscribedPartner?: number | string;
    /** `longitude,latitude` geofence */
    point?: string;
}): Promise<ApiResponse<FeatureAccessResponse, FeatureAccessResponse>>;
export declare function billFeatureUsage(client: FikashopClient, featureCode: string, opts?: {
    quantity?: number;
    subscriptionId?: string;
    /** Subscribed partner — integer PK or string code */
    subscribedPartner?: number | string;
    /** `longitude,latitude` geofence */
    point?: string;
    idempotencyKey?: string;
}): Promise<ApiResponse<FeatureBillResponse, FeatureBillResponse>>;
export declare function listInvoices(client: FikashopClient, params?: Record<string, unknown>): Promise<ApiResponse<unknown, unknown>>;
export declare function getPublicInvoice(client: FikashopClient, uuid: string): Promise<ApiResponse<PublicInvoice, PublicInvoice>>;
export declare function initiatePublicPay(client: FikashopClient, uuid: string, paymentMethodCode: string): Promise<ApiResponse<PublicPayInitResponse, PublicPayInitResponse>>;
export declare function capturePayment(client: FikashopClient, paymentReference: string, inputFields: PaymentFormValues): Promise<ApiResponse<PaymentCaptureResponse, PaymentCaptureResponse>>;
/** Poll until a subscription becomes active (e.g. after wallet top-up + Celery retry). */
export declare function pollSubscriptionActive(client: FikashopClient, opts?: {
    subscriptionId?: string;
    maxAttempts?: number;
    intervalMs?: number;
}): Promise<UserSubscription | null>;
/** Poll wallet balance until it reaches at least `minBalance`. */
export declare function waitForWalletCredit(client: FikashopClient, minBalance: string | number, opts?: {
    maxAttempts?: number;
    intervalMs?: number;
}): Promise<string | null>;
/** Poll public invoice until paid (Checkout B confirmation or dunning recovery). */
export declare function waitForInvoicePaid(client: FikashopClient, invoiceUuid: string, opts?: {
    maxAttempts?: number;
    intervalMs?: number;
}): Promise<PublicInvoice | null>;
/** Human-readable message when a gateway helper response is not ok. */
export declare function describeGatewayFailure(resp: ApiResponse<unknown>, context?: import('./errors.js').GatewayFailureContext): string;
export { PATHS as FikashopGatewayPaths };
//# sourceMappingURL=gateway.d.ts.map