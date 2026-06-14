/**
 * Express example: unified fikashop webhook receiver (Stripe-style envelope).
 *
 * npm install express
 * Use express.raw({ type: 'application/json' }) so HMAC matches the raw body.
 *
 * Prefer this over legacy flat `{ invoice_id, status }` payloads — see webhook-host-handler.ts.
 */
import express from 'express';
import { handleFikashopWebhook } from './webhook-host-handler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.post(
  '/webhooks/fikashop',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const result = await handleFikashopWebhook({
      rawBody: req.body as Buffer,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
    res.status(result.statusCode).json(result.body);
  },
);

app.listen(PORT, () => console.log(`Fikashop webhook listening on :${PORT}`));
