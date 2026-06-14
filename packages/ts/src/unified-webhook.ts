import { createHash } from 'node:crypto';
import type { UnifiedWebhookEnvelope } from './types.js';
import {
  FIKASHOP_SIGNATURE_HEADER,
  FIKASHOP_UNIFIED_SIGNATURE_HEADER,
  parseUnifiedWebhookEnvelope,
  verifyFikashopSignature,
  verifyUnifiedFikashopSignature,
} from './webhook-verify.js';
import type { WebhookRouterHandlers } from './webhook-router.js';
import { createWebhookRouter } from './webhook-router.js';

export type UnifiedWebhookEvent = {
  eventId: string;
  eventType: string;
  dataObject: Record<string, unknown>;
};

export type WebhookProcessResult = {
  statusCode: number;
  body: Record<string, unknown>;
};

export type UnifiedWebhookHandler = {
  isDuplicate: (eventId: string) => boolean;
  markReceived: (event: UnifiedWebhookEvent, payload: Record<string, unknown>) => void;
  handleEvent: (event: UnifiedWebhookEvent, payload: Record<string, unknown>) => void | Promise<void>;
};

/** Stable event id — mirrors Python ``derive_event_id``. */
export function deriveEventId(payload: Record<string, unknown>, rawBody: Buffer | Uint8Array | string): string {
  const id = String(payload.id ?? '').trim();
  const type = String(payload.type ?? '').trim();
  if (id && type) return id;

  for (const key of ['event_id', 'webhook_id', 'delivery_id']) {
    const raw = payload[key];
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }

  const event = payload.event;
  if (event && typeof event === 'object' && (event as { id?: unknown }).id) {
    return String((event as { id: unknown }).id).trim();
  }

  const invoiceId = String(payload.invoice_id ?? payload.id ?? '').trim();
  const rawStatus = String(payload.status ?? '')
    .trim()
    .toLowerCase();
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody);
  const digest = createHashSha256(body);
  return `invoice:${invoiceId}:status:${rawStatus}:sha256:${digest}`;
}

function createHashSha256(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

export function parseUnifiedWebhookEvent(
  payload: Record<string, unknown>,
  rawBody: Buffer | Uint8Array | string,
): UnifiedWebhookEvent {
  const envelope = parseUnifiedWebhookEnvelope(payload);
  const eventType = envelope?.type ?? String(payload.type ?? '').trim();
  const data = payload.data;
  let dataObject: Record<string, unknown> = {};
  if (data && typeof data === 'object' && (data as { object?: unknown }).object) {
    const obj = (data as { object?: unknown }).object;
    if (obj && typeof obj === 'object') dataObject = obj as Record<string, unknown>;
  }
  return {
    eventId: deriveEventId(payload, rawBody),
    eventType,
    dataObject,
  };
}

export type ProcessUnifiedWebhookInput = {
  rawBody: Buffer | Uint8Array | string;
  fikashopSignature?: string;
  legacySignature?: string;
  secret?: string | null;
  handler: UnifiedWebhookHandler;
  /** When set, route to typed handlers after verify + dedupe (before handler.handleEvent). */
  router?: WebhookRouterHandlers;
};

/**
 * Verify signature, dedupe on event id, dispatch — parity with Python ``process_unified_webhook``.
 */
export async function processUnifiedWebhook(input: ProcessUnifiedWebhookInput): Promise<WebhookProcessResult> {
  const rawBody = input.rawBody;
  const secret = input.secret ?? null;
  const fikashopSignature = input.fikashopSignature ?? '';
  const legacySignature = input.legacySignature ?? '';

  if (secret) {
    let verified = false;
    if (fikashopSignature && verifyUnifiedFikashopSignature(secret, rawBody, fikashopSignature)) {
      verified = true;
    } else if (legacySignature && verifyFikashopSignature(secret, rawBody, legacySignature)) {
      verified = true;
    }
    if (!verified) {
      if (!fikashopSignature && !legacySignature) {
        return { statusCode: 403, body: { detail: 'Missing webhook signature.' } };
      }
      return { statusCode: 403, body: { detail: 'Invalid webhook signature.' } };
    }
  }

  let payload: Record<string, unknown>;
  try {
    const text = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { statusCode: 400, body: { detail: 'Invalid JSON body.' } };
  }

  const event = parseUnifiedWebhookEvent(payload, rawBody);
  if (!event.eventType) {
    return { statusCode: 400, body: { detail: 'type required' } };
  }

  if (input.handler.isDuplicate(event.eventId)) {
    return { statusCode: 200, body: { received: true, duplicate: true } };
  }

  input.handler.markReceived(event, payload);

  if (input.router) {
    const envelope: UnifiedWebhookEnvelope = {
      id: event.eventId,
      type: event.eventType,
      data: { object: event.dataObject },
    };
    const route = createWebhookRouter(input.router);
    await route(envelope);
  }

  await input.handler.handleEvent(event, payload);
  return { statusCode: 200, body: { received: true } };
}

/** In-memory handler for tests and examples. */
export class InMemoryUnifiedWebhookHandler implements UnifiedWebhookHandler {
  seenEventIds = new Set<string>();
  events: Array<[string, Record<string, unknown>]> = [];

  isDuplicate(eventId: string): boolean {
    return this.seenEventIds.has(eventId);
  }

  markReceived(event: UnifiedWebhookEvent, _payload: Record<string, unknown>): void {
    this.seenEventIds.add(event.eventId);
  }

  async handleEvent(event: UnifiedWebhookEvent, _payload: Record<string, unknown>): Promise<void> {
    this.events.push([event.eventType, { ...event.dataObject }]);
  }
}

export { FIKASHOP_SIGNATURE_HEADER, FIKASHOP_UNIFIED_SIGNATURE_HEADER };
