import { createHmac, timingSafeEqual } from 'node:crypto';
export const FIKASHOP_UNIFIED_SIGNATURE_HEADER = 'Fikashop-Signature';
export function computeUnifiedFikashopSignature(secret, timestamp, rawBody) {
    const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody);
    const prefix = Buffer.from(`${timestamp}.`, 'utf8');
    return createHmac('sha256', secret).update(Buffer.concat([prefix, body])).digest('hex');
}
export function verifyUnifiedFikashopSignature(secret, rawBody, headerValue, toleranceSeconds = 300) {
    if (!secret)
        return true;
    if (!headerValue)
        return false;
    const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(headerValue.trim());
    if (!match)
        return false;
    const timestamp = Number(match[1]);
    const provided = match[2];
    if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds)
        return false;
    const expected = computeUnifiedFikashopSignature(secret, timestamp, rawBody);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length)
        return false;
    return timingSafeEqual(a, b);
}
export function parseUnifiedWebhookEnvelope(payload) {
    if (!payload || typeof payload !== 'object')
        return null;
    const p = payload;
    const id = String(p.id ?? '').trim();
    const type = String(p.type ?? '').trim();
    if (!id || !type)
        return null;
    const data = p.data;
    return {
        id,
        type,
        api_version: typeof p.api_version === 'string' ? p.api_version : undefined,
        created: typeof p.created === 'number' ? p.created : undefined,
        livemode: typeof p.livemode === 'boolean' ? p.livemode : undefined,
        data: data && typeof data === 'object'
            ? { object: data.object }
            : undefined,
    };
}
/** Prefer external_invoice_reference; fall back to invoice_uuid or invoice_id. */
export function extractWebhookInvoiceReference(envelope) {
    const obj = envelope.data?.object ?? {};
    for (const key of ['external_invoice_reference', 'invoice_uuid', 'invoice_id', 'id']) {
        const raw = obj[key];
        if (raw != null && String(raw).trim())
            return String(raw).trim();
    }
    return '';
}
//# sourceMappingURL=webhook-verify.js.map