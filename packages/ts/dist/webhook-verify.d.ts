export declare const FIKASHOP_UNIFIED_SIGNATURE_HEADER = "Fikashop-Signature";
export declare function computeUnifiedFikashopSignature(secret: string, timestamp: number, rawBody: Buffer | Uint8Array | string): string;
export declare function verifyUnifiedFikashopSignature(secret: string, rawBody: Buffer | Uint8Array | string, headerValue: string, toleranceSeconds?: number): boolean;
export declare function parseUnifiedWebhookEnvelope(payload: unknown): import('./types.js').UnifiedWebhookEnvelope | null;
/** Prefer external_invoice_reference; fall back to invoice_uuid or invoice_id. */
export declare function extractWebhookInvoiceReference(envelope: import('./types.js').UnifiedWebhookEnvelope): string;
//# sourceMappingURL=webhook-verify.d.ts.map