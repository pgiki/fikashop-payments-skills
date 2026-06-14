export const AdminSubscriptionPaths = {
    plans: '/shop/api/admin/subscription-plans/',
    plan: (planId) => `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/`,
    planCosts: (planId) => `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/costs/`,
    planFeatures: (planId) => `/shop/api/admin/subscription-plans/${encodeURIComponent(planId)}/features/`,
    planCost: (costId) => `/shop/api/admin/plan-costs/${encodeURIComponent(costId)}/`,
    planFeature: (planFeatureId) => `/shop/api/admin/plan-features/${encodeURIComponent(planFeatureId)}/`,
};
export async function listAdminSubscriptionPlans(client, params) {
    return client.get(AdminSubscriptionPaths.plans, params);
}
export async function createAdminSubscriptionPlan(client, body) {
    return client.post(AdminSubscriptionPaths.plans, body);
}
export async function updateAdminSubscriptionPlan(client, planId, body) {
    return client.patch(AdminSubscriptionPaths.plan(planId), body);
}
export async function deleteAdminSubscriptionPlan(client, planId) {
    return client.delete(AdminSubscriptionPaths.plan(planId));
}
export async function createAdminPlanCost(client, planId, body) {
    return client.post(AdminSubscriptionPaths.planCosts(planId), body);
}
export async function updateAdminPlanCost(client, costId, body) {
    return client.patch(AdminSubscriptionPaths.planCost(costId), body);
}
export async function deleteAdminPlanCost(client, costId) {
    return client.delete(AdminSubscriptionPaths.planCost(costId));
}
export async function createAdminPlanFeature(client, planId, body) {
    return client.post(AdminSubscriptionPaths.planFeatures(planId), body);
}
export async function updateAdminPlanFeature(client, planFeatureId, body) {
    return client.patch(AdminSubscriptionPaths.planFeature(planFeatureId), body);
}
export async function deleteAdminPlanFeature(client, planFeatureId) {
    return client.delete(AdminSubscriptionPaths.planFeature(planFeatureId));
}
//# sourceMappingURL=admin-subscriptions.js.map