/**
 * Checkout B — pay a public invoice.
 *
 * This example shows a third-party app paying an invoice on behalf of the
 * authenticated user. You need: a user OIDC access token, a partner code,
 * and a public invoice UUID.
 *
 * Response status handling:
 *   "redirect" → open redirect_url in browser
 *   "waiting"  → STK push sent; wait for webhook confirmation
 *   "success"  → payment confirmed synchronously
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

  // 1. Load invoice and check if payment is allowed
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

  // 2. Initiate payment — returns payment_reference and process_url
  const payResp = await initiatePublicPay(client, invoiceUuid, paymentMethodCode);
  if (!payResp.ok || !payResp.data?.payment_reference) {
    throw new Error(payResp.problem ?? 'Failed to initiate payment');
  }

  // 3. Collect input_fields from the selected method
  const fields = getInputFieldsForMethod(method);
  const values = defaultFieldValues(fields);
  const errors = validateFieldValues(fields, values);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }

  // 4. Capture — submit details to the payment provider
  const captureResp = await capturePayment(client, payResp.data.payment_reference, values);
  if (!captureResp.ok) {
    throw new Error(captureResp.problem ?? 'Capture failed');
  }

  const status = captureResp.data?.status;

  // 5. Handle response status
  if (isRedirectStatus(status) && captureResp.data?.redirect_url) {
    // Redirect: open this URL in the user's browser to complete payment
    return { step: 'redirect' as const, url: captureResp.data.redirect_url };
  }

  if (status === 'waiting') {
    // Async: STK push or provider callback pending — wait for webhook
    return {
      step: 'waiting' as const,
      detail: captureResp.data?.detail,
      processUrl: payResp.data.process_url,
    };
  }

  // Synchronous confirm (e.g. LIPA Pay emulator)
  return {
    step: 'done' as const,
    status,
    detail: captureResp.data?.detail,
    processUrl: payResp.data.process_url,
    payload: buildCapturePayload(values),
  };
}

export { payPublicInvoice };
