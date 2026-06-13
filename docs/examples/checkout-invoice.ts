/**
 * Checkout B (shared invoice pay) — end-to-end client flow.
 * Requires Bearer token, configured partner, and a public invoice UUID.
 */
import {
  buildCapturePayload,
  capturePayment,
  createFikashopClient,
  defaultFieldValues,
  getInputFieldsForMethod,
  getPublicInvoice,
  initiatePublicPay,
  isRedirectStatus,
  validateFieldValues,
} from '@fikashop/payment-gateway-client';

async function payPublicInvoice(
  accessToken: string,
  partnerCode: string,
  invoiceUuid: string,
  paymentMethodCode: string,
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  const invoiceResp = await getPublicInvoice(client, invoiceUuid);
  if (!invoiceResp.ok || !invoiceResp.data) {
    throw new Error(invoiceResp.problem ?? 'Failed to load invoice');
  }
  if (invoiceResp.data.public_pay_blocked) {
    throw new Error(invoiceResp.data.public_pay_blocked_reason ?? 'Payment blocked');
  }

  const method = invoiceResp.data.payment_methods?.find((m) => m.code === paymentMethodCode);
  if (!method) {
    throw new Error(`Method ${paymentMethodCode} not available`);
  }

  const payResp = await initiatePublicPay(client, invoiceUuid, paymentMethodCode);
  if (!payResp.ok || !payResp.data?.payment_reference) {
    throw new Error(payResp.problem ?? 'Failed to initiate payment');
  }

  const fields = getInputFieldsForMethod(method);
  const values = defaultFieldValues(fields);
  const errors = validateFieldValues(fields, values);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }

  const captureResp = await capturePayment(client, payResp.data.payment_reference, values);
  if (!captureResp.ok) {
    throw new Error(captureResp.problem ?? 'Capture failed');
  }

  if (isRedirectStatus(captureResp.data?.status) && captureResp.data?.redirect_url) {
    return { step: 'redirect' as const, url: captureResp.data.redirect_url };
  }

  return {
    step: 'done' as const,
    status: captureResp.data?.status,
    processUrl: payResp.data.process_url,
    payload: buildCapturePayload(values),
  };
}

export { payPublicInvoice };
