import type { FikashopClient } from './client.js';
import type { PaginatedResults, PartnerSummary, PaymentCaptureResponse, PaymentFormValues, PlanCostSummary, PublicInvoice, PublicPayInitResponse, SubscriptionListResponse, SubscriptionPlanCatalogItem, SubscriptionTransaction, SubscriptionWalletBalanceResponse, UserSubscription, WalletDepositResponse } from './types.js';
declare const PATHS: {
    readonly adminPartners: "/shop/api/admin/partners/";
    readonly subscriptions: "/invoices/api/subscriptions/";
    readonly balance: "/invoices/api/subscriptions/balance/";
    readonly walletDeposit: "/invoices/api/subscriptions/wallet-deposit/";
    readonly plans: "/invoices/api/subscriptions/plans/";
    readonly planOptions: "/invoices/api/subscriptions/plan-options/";
    readonly changePlan: "/invoices/api/subscriptions/change-plan/";
    readonly cancel: "/invoices/api/subscriptions/cancel/";
    readonly transactions: "/invoices/api/subscriptions/transactions/";
    readonly paymentMethods: "/invoices/api/subscriptions/payment-methods/";
    readonly invoices: "/invoices/api/invoices/";
    readonly publicInvoice: (uuid: string) => string;
    readonly publicPay: (uuid: string) => string;
    readonly processPayment: (reference: string) => string;
};
export declare function parsePartnerList(data: unknown): PartnerSummary[];
/** Businesses linked to the authenticated user — use `code` or `id` for X-Partner-Id. */
export declare function listUserPartners(client: FikashopClient, params?: Record<string, unknown>): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function getSubscriptionBalance(client: FikashopClient): Promise<import("apisauce").ApiResponse<SubscriptionWalletBalanceResponse, SubscriptionWalletBalanceResponse>>;
export declare function getDepositPaymentMethods(client: FikashopClient): Promise<{
    response: import("apisauce").ApiResponse<SubscriptionWalletBalanceResponse, SubscriptionWalletBalanceResponse>;
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
}): Promise<import("apisauce").ApiResponse<WalletDepositResponse, WalletDepositResponse>>;
export declare function listSubscriptions(client: FikashopClient): Promise<import("apisauce").ApiResponse<SubscriptionListResponse, SubscriptionListResponse>>;
export declare function getSubscriptionPlans(client: FikashopClient): Promise<import("apisauce").ApiResponse<SubscriptionPlanCatalogItem[], SubscriptionPlanCatalogItem[]>>;
export declare function getPlanOptions(client: FikashopClient, subscriptionId: string): Promise<import("apisauce").ApiResponse<PlanCostSummary[], PlanCostSummary[]>>;
export declare function subscribeToPlan(client: FikashopClient, planCostSlug: string): Promise<import("apisauce").ApiResponse<UserSubscription, UserSubscription>>;
export declare function changePlan(client: FikashopClient, input: {
    subscriptionId: string;
    targetPlanCostSlug: string;
    effectiveMode?: 'immediate' | 'next_cycle';
}): Promise<import("apisauce").ApiResponse<UserSubscription, UserSubscription>>;
export declare function cancelSubscription(client: FikashopClient, subscriptionId: string): Promise<import("apisauce").ApiResponse<UserSubscription, UserSubscription>>;
export declare function getSubscriptionTransactions(client: FikashopClient, params?: {
    page?: number;
    size?: number;
}): Promise<import("apisauce").ApiResponse<PaginatedResults<SubscriptionTransaction>, PaginatedResults<SubscriptionTransaction>>>;
export declare function getSubscriptionPaymentMethods(client: FikashopClient, params?: {
    exclude_codes?: string;
}): Promise<import("apisauce").ApiResponse<import("./types.js").PaymentMethod[], import("./types.js").PaymentMethod[]>>;
export declare function listInvoices(client: FikashopClient, params?: Record<string, unknown>): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function getPublicInvoice(client: FikashopClient, uuid: string): Promise<import("apisauce").ApiResponse<PublicInvoice, PublicInvoice>>;
export declare function initiatePublicPay(client: FikashopClient, uuid: string, paymentMethodCode: string): Promise<import("apisauce").ApiResponse<PublicPayInitResponse, PublicPayInitResponse>>;
export declare function capturePayment(client: FikashopClient, paymentReference: string, inputFields: PaymentFormValues): Promise<import("apisauce").ApiResponse<PaymentCaptureResponse, PaymentCaptureResponse>>;
export { PATHS as FikashopGatewayPaths };
//# sourceMappingURL=gateway.d.ts.map