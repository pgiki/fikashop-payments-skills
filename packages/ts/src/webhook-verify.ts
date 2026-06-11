import { createHmac, timingSafeEqual } from 'node:crypto';

export const FIKASHOP_SIGNATURE_HEADER = 'X-Fikachu-Signature';

export function computeFikashopSignature(secret: string, rawBody: Buffer | Uint8Array | string): string {
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody);
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyFikashopSignature(
  secret: string,
  rawBody: Buffer | Uint8Array | string,
  providedSig: string,
): boolean {
  if (!secret) return true;
  if (!providedSig) return false;
  const expected = computeFikashopSignature(secret, rawBody);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(providedSig, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
