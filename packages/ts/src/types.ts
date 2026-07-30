export type PaymentInputField = {
  code: string;
  label: string;
  type: string;
  is_required: boolean;
  help_text?: string | null;
  default_value?: unknown;
  schema?: Record<string, unknown> | null;
  /** Legacy balance-endpoint shape */
  name?: string;
  required?: boolean;
};

export type PaymentMethod = {
  code: string;
  name: string;
  method_type?: string;
  description?: string;
  input_fields?: PaymentInputField[];
};

export type SubscriptionWalletBalanceResponse = {
  wallet_id: string;
  balance: string | number;
  payment_methods: PaymentMethod[];
};

export type InvoiceListCardItem = {
  uuid: string;
  number: string;
  status: string;
  currency: string;
  date?: string;
  total: number | string;
  balance?: number | string;
};

export type PublicInvoice = {
  uuid: string;
  number?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
  payment_methods?: PaymentMethod[];
  public_pay_blocked?: boolean;
  public_pay_blocked_reason?: string | null;
  from_address?: string;
};

export type WalletDepositResponse = {
  status?: string;
  redirect_url?: string;
  detail?: string;
};

export type PublicPayInitResponse = {
  payment_reference?: string;
  process_url?: string;
  detail?: string;
};

export type PaymentCaptureResponse = {
  status?: string;
  redirect_url?: string;
  detail?: string;
};

export type PaymentFormValues = Record<string, string | boolean>;

/** Row from `GET /shop/api/admin/partners/` — use `code` or `id` for X-Partner-Id. */
export type PartnerSummary = {
  id: number;
  code: string;
  name: string;
  phone_number?: string;
  is_active?: boolean;
  wallet_id?: string;
};

export type PlanCostSummary = {
  id: number | string;
  slug: string;
  recurrence_period?: number;
  recurrence_unit?: string;
  cost?: string | number;
  currency?: string;
  plan_name?: string;
  plan_description?: string;
  plan?: {
    id?: string;
    slug?: string;
    plan_name?: string;
    plan_description?: string;
    grace_period?: number;
  };
};

export type SubscriptionPlanCatalogItem = {
  id: number | string;
  slug: string;
  plan_name: string;
  plan_description?: string;
  grace_period?: number;
  partner_id?: number | null;
  partner_code?: string | null;
  /** Present only when `?includes=subscribed_plan_cost_id` */
  subscribed_plan_cost_id?: string | null;
  tags?: string[];
  /** GeoJSON MultiPolygon or null */
  service_area?: Record<string, unknown> | null;
  costs?: PlanCostSummary[];
  features?: FeatureUsageSummary[];
};

export type AdminPricingTierInput = {
  start_quantity: number;
  end_quantity?: number | null;
  unit_price: string;
  flat_fee?: string;
};

export type AdminPlanCostWrite = {
  slug: string;
  recurrence_period?: number;
  recurrence_unit?: string;
  cost?: string | null;
  currency?: string;
};

export type AdminPlanFeatureWrite = {
  code: string;
  name?: string;
  feature_type?: string;
  pricing_model?: string;
  unit?: string;
  enabled?: boolean;
  quota?: number | null;
  overage_rate?: string | null;
  rate_limit?: number | null;
  meta?: Record<string, unknown> | null;
  pricing_tiers?: AdminPricingTierInput[];
};

export type AdminSubscriptionPlanWrite = {
  slug: string;
  plan_name?: string;
  plan_description?: string;
  grace_period?: number;
  is_feature_based?: boolean;
  tags?: string[];
  partner?: number | null;
  /** GeoJSON MultiPolygon or null */
  service_area?: Record<string, unknown> | null;
  costs?: AdminPlanCostWrite[];
  features?: AdminPlanFeatureWrite[];
};

export type AdminSubscriptionPlan = SubscriptionPlanCatalogItem & {
  is_feature_based?: boolean;
};

export type FeatureUsageSummary = {
  feature_code: string;
  feature_name?: string;
  feature_type?: string;
  pricing_model?: string;
  unit?: string;
  enabled?: boolean;
  quota?: number | null;
  rate_limit?: number | null;
  overage_rate?: string | null;
  meta?: Record<string, unknown>;
  pricing_tiers?: unknown[];
  used?: number;
  remaining?: number;
};

export type UnpaidInvoiceSummary = {
  uuid: string;
  number?: string;
  currency?: string;
  status?: string;
  date?: string;
  due_date?: string;
  payment_terms?: string;
  total?: string | number;
  balance?: string | number;
};

export type SubscriptionMeta = {
  partner_id?: number | null;
  partner_code?: string | null;
  source?: string;
  plan_cost_slug?: string;
  client_reference?: string;
  metadata?: Record<string, unknown>;
  dunning_paid_invoice_uuids?: string[];
  created_at?: string;
};

export type RecoveryHint = {
  recommended_action: 'none' | 'wallet_topup' | 'pay_dunning_invoice';
  dunning_invoice_uuid?: string | null;
};

export type SubscriptionWebhookPayload = {
  subscription_id: string;
  user_id?: number;
  partner_id?: number | null;
  active?: boolean;
  cancelled?: boolean;
  plan_cost_slug?: string;
  client_reference?: string;
  metadata?: Record<string, unknown>;
  unpaid_invoices?: UnpaidInvoiceSummary[];
  billing_retry_exhausted?: boolean;
  date_billing_next?: string;
  updated_at?: string;
};

export type UserSubscription = {
  id: string;
  subscribed_partner_id?: number | null;
  subscribed_partner_code?: string | null;
  pending_plan_cost_id?: string | null;
  pending_plan_cost_slug?: string | null;
  active?: boolean;
  cancelled?: boolean;
  billing_retry_exhausted?: boolean;
  payment_failure_notify_count?: number;
  date_billing_start?: string;
  date_billing_end?: string | null;
  date_billing_last?: string | null;
  date_billing_next?: string | null;
  meta?: SubscriptionMeta;
  subscription?: PlanCostSummary;
  unpaid_invoices?: UnpaidInvoiceSummary[];
  feature_usage?: FeatureUsageSummary[];
  recovery?: RecoveryHint;
  links?: {
    invoices?: string;
    wallet_transactions?: string;
    wallet_balance?: string;
  };
};

export type FeatureAccessResponse = {
  feature_code: string;
  feature_name?: string;
  feature_type?: string;
  pricing_model?: string;
  unit?: string;
  enabled?: boolean;
  quota?: number | null;
  rate_limit?: number | null;
  overage_rate?: string | null;
  pricing_tiers?: unknown[];
  allowed: boolean;
  used?: number;
  remaining?: number;
  error?: string;
  detail?: string;
  subscription_id?: string;
  period_start?: string;
  period_end?: string;
};

export type FeatureBillResponse = {
  feature_code: string;
  feature_name?: string;
  feature_type?: string;
  allowed?: boolean;
  used?: number;
  remaining?: number;
  quota?: number | null;
  subscription_id?: string;
  status?: string;
  billed_quantity?: number;
  amount_charged?: string | number;
  currency?: string;
  detail?: string;
};

export type SubscriptionListResponse = {
  balance?: string | number;
  page?: number;
  is_paginated?: boolean;
  next?: string | null;
  previous?: string | null;
  count?: number;
  total_pages?: number;
  subscriptions?: UserSubscription[];
};

export type SubscriptionTransaction = Record<string, unknown>;

export type PaginatedResults<T> = {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

export type UnifiedWebhookEnvelope = {
  id: string;
  type: string;
  api_version?: string;
  created?: number;
  livemode?: boolean;
  data?: { object?: Record<string, unknown> };
};
