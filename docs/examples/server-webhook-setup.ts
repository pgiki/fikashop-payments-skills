/**
 * Register a webhook endpoint to receive fikashop payment and subscription events.
 *
 * Requires the server admin token (FIKASHOP_ADMIN_ACCESS_TOKEN) — never run
 * this from client bundles (React Native, Expo, browser).
 *
 * After registration, fikashop delivers Stripe-style event envelopes to your URL.
 * See webhook-host-handler.ts for a receiver example.
 */
import { createFikashopClient } from '@fikashop/payment-gateway-client';

async function registerWebhookEndpoint() {
  const adminToken = process.env.FIKASHOP_ADMIN_ACCESS_TOKEN;
  const baseUrl = process.env.FIKASHOP_API_URL ?? 'https://api.fikashop.app';
  const partnerCode = process.env.FIKASHOP_PARTNER_CODE ?? '';
  const webhookUrl = process.env.FIKASHOP_WEBHOOK_URL ?? 'https://your-app.example/webhooks/fikashop';
  const webhookSecret = process.env.FIKASHOP_WEBHOOK_SECRET ?? 'whsec_change_me';

  if (!adminToken) {
    throw new Error('Set FIKASHOP_ADMIN_ACCESS_TOKEN (dashboard Settings → API keys)');
  }
  if (!partnerCode) {
    throw new Error('Set FIKASHOP_PARTNER_CODE for X-Partner-Id');
  }

  const client = createFikashopClient({
    baseUrl,
    getAccessToken: async () => adminToken,
    partnerId: partnerCode,
  });

  // Register — empty subscribed_events means all event types
  const resp = await client.post('/shop/api/admin/webhooks/endpoints/', {
    url: webhookUrl,
    secret: webhookSecret,
    enabled: true,
    is_default: true,
    subscribed_events: [],
  });

  if (!resp.ok) {
    throw new Error(resp.problem ?? `Webhook registration failed (${resp.status})`);
  }

  // Response includes id, uuid, url, enabled, is_default, subscribed_events, created_at
  // secret is write-only and never returned
  return resp.data;
}

registerWebhookEndpoint().catch(console.error);
