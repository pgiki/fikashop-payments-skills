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
  id: number;
  slug: string;
  recurrence_period?: number;
  recurrence_unit?: string;
  cost?: string | number;
  currency?: string;
  plan_name?: string;
  plan_description?: string;
};

export type SubscriptionPlanCatalogItem = {
  id: number;
  slug: string;
  plan_name: string;
  plan_description?: string;
  grace_period?: number;
  costs?: PlanCostSummary[];
  features?: unknown[];
};

export type UserSubscription = {
  id: string;
  active?: boolean;
  cancelled?: boolean;
  date_billing_start?: string;
  date_billing_next?: string | null;
  subscription?: PlanCostSummary & { plan?: { slug?: string; plan_name?: string } };
  unpaid_invoices?: unknown[];
};

export type SubscriptionListResponse = {
  balance?: string | number;
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
