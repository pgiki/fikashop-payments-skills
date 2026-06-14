import { FIKASHOP_SIGNATURE_HEADER, FIKASHOP_UNIFIED_SIGNATURE_HEADER } from './webhook-verify.js';
import type { WebhookRouterHandlers } from './webhook-router.js';
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
export declare function deriveEventId(payload: Record<string, unknown>, rawBody: Buffer | Uint8Array | string): string;
export declare function parseUnifiedWebhookEvent(payload: Record<string, unknown>, rawBody: Buffer | Uint8Array | string): UnifiedWebhookEvent;
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
export declare function processUnifiedWebhook(input: ProcessUnifiedWebhookInput): Promise<WebhookProcessResult>;
/** In-memory handler for tests and examples. */
export declare class InMemoryUnifiedWebhookHandler implements UnifiedWebhookHandler {
    seenEventIds: Set<string>;
    events: Array<[string, Record<string, unknown>]>;
    isDuplicate(eventId: string): boolean;
    markReceived(event: UnifiedWebhookEvent, _payload: Record<string, unknown>): void;
    handleEvent(event: UnifiedWebhookEvent, _payload: Record<string, unknown>): Promise<void>;
}
export { FIKASHOP_SIGNATURE_HEADER, FIKASHOP_UNIFIED_SIGNATURE_HEADER };
//# sourceMappingURL=unified-webhook.d.ts.map