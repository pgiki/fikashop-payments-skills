import type { FikashopClient } from './client.js';
import type {
  PartnerSummary,
  PaymentCaptureResponse,
  PaymentFormValues,
  PublicInvoice,
  PublicPayInitResponse,
  SubscriptionWalletBalanceResponse,
  WalletDepositResponse,
} from './types.js';
import { buildCapturePayload, buildDepositPayload, filterDepositMethods } from './payment-fields.js';

const PATHS = {
  adminPartners: '/shop/api/admin/partners/',
  balance: '/invoices/api/subscriptions/balance/',
  walletDeposit: '/invoices/api/subscriptions/wallet-deposit/',
  invoices: '/invoices/api/invoices/',
  publicInvoice: (uuid: string) => `/invoices/api/public/${uuid}/`,
  publicPay: (uuid: string) => `/invoices/api/public/${uuid}/pay/`,
  processPayment: (reference: string) => `/payments/process/${reference}/`,
} as const;

export function parsePartnerList(data: unknown): PartnerSummary[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as { results?: PartnerSummary[] };
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(data)) return data as PartnerSummary[];
  return [];
}

/** Businesses linked to the authenticated user — use `code` or `id` for X-Partner-Id. */
export async function listUserPartners(client: FikashopClient, params?: Record<string, unknown>) {
  return client.get(PATHS.adminPartners, params);
}

export async function getSubscriptionBalance(client: FikashopClient) {
  return client.get<SubscriptionWalletBalanceResponse>(PATHS.balance);
}

export async function getDepositPaymentMethods(client: FikashopClient) {
  const resp = await getSubscriptionBalance(client);
  if (!resp.ok || !resp.data) return { response: resp, methods: [] as const };
  return { response: resp, methods: filterDepositMethods(resp.data.payment_methods) };
}

export async function walletDeposit(
  client: FikashopClient,
  input: {
    total: string;
    variant: string;
    currency: string;
    description?: string;
    inputFields?: Record<string, string>;
  },
) {
  return client.post<WalletDepositResponse>(PATHS.walletDeposit, buildDepositPayload(input));
}

export async function listInvoices(client: FikashopClient, params?: Record<string, unknown>) {
  return client.get(PATHS.invoices, params);
}

export async function getPublicInvoice(client: FikashopClient, uuid: string) {
  return client.get<PublicInvoice>(PATHS.publicInvoice(uuid));
}

export async function initiatePublicPay(client: FikashopClient, uuid: string, paymentMethodCode: string) {
  return client.post<PublicPayInitResponse>(PATHS.publicPay(uuid), {
    payment_method_code: paymentMethodCode,
  });
}

export async function capturePayment(
  client: FikashopClient,
  paymentReference: string,
  inputFields: PaymentFormValues,
) {
  return client.post<PaymentCaptureResponse>(
    PATHS.processPayment(paymentReference),
    buildCapturePayload(inputFields),
  );
}

export { PATHS as FikashopGatewayPaths };
