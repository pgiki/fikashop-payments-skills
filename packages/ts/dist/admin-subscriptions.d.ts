import type { FikashopClient } from './client.js';
import type { AdminPlanCostWrite, AdminPlanFeatureWrite, AdminSubscriptionPlan, AdminSubscriptionPlanWrite, PaginatedResults } from './types.js';
export declare const AdminSubscriptionPaths: {
    readonly plans: "/shop/api/admin/subscription-plans/";
    readonly plan: (planId: string) => string;
    readonly planCosts: (planId: string) => string;
    readonly planFeatures: (planId: string) => string;
    readonly planCost: (costId: string) => string;
    readonly planFeature: (planFeatureId: string) => string;
};
export declare function listAdminSubscriptionPlans(client: FikashopClient, params?: Record<string, unknown>): Promise<import("apisauce").ApiResponse<PaginatedResults<AdminSubscriptionPlan> | AdminSubscriptionPlan[], PaginatedResults<AdminSubscriptionPlan> | AdminSubscriptionPlan[]>>;
export declare function createAdminSubscriptionPlan(client: FikashopClient, body: AdminSubscriptionPlanWrite): Promise<import("apisauce").ApiResponse<AdminSubscriptionPlan, AdminSubscriptionPlan>>;
export declare function updateAdminSubscriptionPlan(client: FikashopClient, planId: string, body: Partial<AdminSubscriptionPlanWrite>): Promise<import("apisauce").ApiResponse<AdminSubscriptionPlan, AdminSubscriptionPlan>>;
export declare function deleteAdminSubscriptionPlan(client: FikashopClient, planId: string): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function createAdminPlanCost(client: FikashopClient, planId: string, body: AdminPlanCostWrite): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function updateAdminPlanCost(client: FikashopClient, costId: string, body: Partial<AdminPlanCostWrite>): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function deleteAdminPlanCost(client: FikashopClient, costId: string): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function createAdminPlanFeature(client: FikashopClient, planId: string, body: AdminPlanFeatureWrite): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function updateAdminPlanFeature(client: FikashopClient, planFeatureId: string, body: Partial<AdminPlanFeatureWrite>): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
export declare function deleteAdminPlanFeature(client: FikashopClient, planFeatureId: string): Promise<import("apisauce").ApiResponse<unknown, unknown>>;
//# sourceMappingURL=admin-subscriptions.d.ts.map