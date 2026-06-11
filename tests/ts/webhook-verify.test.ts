import { describe, expect, it } from 'vitest';
import {
  computeFikashopSignature,
  verifyFikashopSignature,
} from '../../packages/ts/src/webhook-verify';

describe('webhook-verify', () => {
  const secret = 'test-secret';
  const body = '{"invoice_id": "inv-1", "status": "paid"}';

  it('computes HMAC-SHA256 hex', () => {
    const sig = computeFikashopSignature(secret, body);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifies valid signature', () => {
    const sig = computeFikashopSignature(secret, body);
    expect(verifyFikashopSignature(secret, body, sig)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifyFikashopSignature(secret, body, 'bad')).toBe(false);
  });

  it('allows empty secret (dev mode)', () => {
    expect(verifyFikashopSignature('', body, '')).toBe(true);
  });
});
