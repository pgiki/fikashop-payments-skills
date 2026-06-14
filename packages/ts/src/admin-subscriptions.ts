import type { FikashopClient } from './client.js';
import type {
  AdminPlanCostWrite,
  AdminPlanFeatureWrite,
  AdminSubscriptionPlan,
  AdminSubscriptionPlanWrite,
  PaginatedResults,
} from './types.js';

export const AdminSubscriptionPaths = {
  plans: '/shop/api/admin/subscription-plans/',
  plan: (planId: string) => `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/`,
  planCosts: (planId: string) =>
    `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/costs/`,
  planFeatures: (planId: string) =>
    `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/features/`,
  planCost: (costId: string) => `/shop/api/admin/plan-costs/${encodeURIComponent(costId)}/`,
  planFeature: (planFeatureId: string) =>
    `/shop/api/admin/plan-features/${encodeURIComponent(planFeatureId)}/`,
} as const;

export async function listAdminSubscriptionPlans(
  client: FikashopClient,
  params?: Record<string, unknown>,
) {
  return client.get<PaginatedResults<AdminSubscriptionPlan> | AdminSubscriptionPlan[]>(
    AdminSubscriptionPaths.plans,
    params,
  );
}

export async function createAdminSubscriptionPlan(
  client: FikashopClient,
  body: AdminSubscriptionPlanWrite,
) {
  return client.post<AdminSubscriptionPlan>(AdminSubscriptionPaths.plans, body);
}

export async function updateAdminSubscriptionPlan(
  client: FikashopClient,
  planId: string,
  body: Partial<AdminSubscriptionPlanWrite>,
) {
  return client.patch<AdminSubscriptionPlan>(AdminSubscriptionPaths.plan(planId), body);
}

export async function deleteAdminSubscriptionPlan(client: FikashopClient, planId: string) {
  return client.delete(AdminSubscriptionPaths.plan(planId));
}

export async function createAdminPlanCost(
  client: FikashopClient,
  planId: string,
  body: AdminPlanCostWrite,
) {
  return client.post(AdminSubscriptionPaths.planCosts(planId), body);
}

export async function updateAdminPlanCost(
  client: FikashopClient,
  costId: string,
  body: Partial<AdminPlanCostWrite>,
) {
  return client.patch(AdminSubscriptionPaths.planCost(costId), body);
}

export async function deleteAdminPlanCost(client: FikashopClient, costId: string) {
  return client.delete(AdminSubscriptionPaths.planCost(costId));
}

export async function createAdminPlanFeature(
  client: FikashopClient,
  planId: string,
  body: AdminPlanFeatureWrite,
) {
  return client.post(AdminSubscriptionPaths.planFeatures(planId), body);
}

export async function updateAdminPlanFeature(
  client: FikashopClient,
  planFeatureId: string,
  body: Partial<AdminPlanFeatureWrite>,
) {
  return client.patch(AdminSubscriptionPaths.planFeature(planFeatureId), body);
}

export async function deleteAdminPlanFeature(client: FikashopClient, planFeatureId: string) {
  return client.delete(AdminSubscriptionPaths.planFeature(planFeatureId));
}
