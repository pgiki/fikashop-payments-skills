/**
 * Feature gating and usage billing — access before action, bill after success.
 * Handles 402 (insufficient wallet) with optional top-up hint.
 */
import {
  billFeatureUsage,
  checkFeatureAccess,
  createFikashopClient,
  getDepositPaymentMethods,
  walletDeposit,
} from '@fikashop/payment-gateway-client';

async function gateAndBillSms(
  accessToken: string,
  partnerCode: string,
  opts?: { subscriptionId?: string; subscribedPartner?: number | string },
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  const accessResp = await checkFeatureAccess(client, 'sms_outbound', opts);
  if (!accessResp.ok) {
    throw new Error(accessResp.problem ?? 'Feature access check failed');
  }
  if (!accessResp.data?.allowed) {
    return {
      step: 'denied' as const,
      reason: accessResp.data?.error ?? accessResp.data?.detail ?? 'Not allowed',
      remaining: accessResp.data?.remaining,
    };
  }

  // Perform gated action (send SMS, etc.) here…

  const billResp = await billFeatureUsage(client, 'sms_outbound', {
    quantity: 1,
    ...opts,
  });

  if (billResp.status === 402) {
    const { methods } = await getDepositPaymentMethods(client);
    return {
      step: 'insufficient_wallet' as const,
      amountCharged: billResp.data?.amount_charged,
      depositMethods: methods.map((m) => m.code),
    };
  }

  if (billResp.status === 429) {
    return { step: 'quota_exceeded' as const, detail: billResp.data?.detail };
  }

  if (!billResp.ok) {
    throw new Error(billResp.problem ?? 'Feature bill failed');
  }

  return {
    step: 'billed' as const,
    used: billResp.data?.used,
    remaining: billResp.data?.remaining,
    amountCharged: billResp.data?.amount_charged,
  };
}

/** Top up wallet after 402 on feature bill, then retry bill once. */
async function billWithTopUpFallback(
  accessToken: string,
  partnerCode: string,
  topUpAmount: string,
  variant: string,
  currency = 'TZS',
) {
  const client = createFikashopClient({
    baseUrl: process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app',
    getAccessToken: async () => accessToken,
  });
  client.configurePartner(process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app', partnerCode);

  let billResp = await billFeatureUsage(client, 'sms_outbound', { quantity: 1 });
  if (billResp.status !== 402) {
    return billResp;
  }

  await walletDeposit(client, {
    total: topUpAmount,
    variant,
    currency,
    inputFields: {},
  });

  billResp = await billFeatureUsage(client, 'sms_outbound', { quantity: 1 });
  return billResp;
}

export { billWithTopUpFallback, gateAndBillSms };
