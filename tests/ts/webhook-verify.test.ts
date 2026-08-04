import { describe, expect, it } from 'vitest';
import {
  computeUnifiedFikashopSignature,
  verifyUnifiedFikashopSignature,
} from '../../packages/ts/src/webhook-verify';

describe('unified webhook signature', () => {
  it('roundtrips', () => {
    const secret = 'test-secret';
    const body = '{"id":"evt_1","type":"payment.succeeded"}';
    const ts = Math.floor(Date.now() / 1000);
    const sig = computeUnifiedFikashopSignature(secret, ts, body);
    expect(verifyUnifiedFikashopSignature(secret, body, `t=${ts},v1=${sig}`)).toBe(true);
  });

  it('rejects bad signature', () => {
    const secret = 'test-secret';
    const body = '{"id":"evt_1"}';
    expect(verifyUnifiedFikashopSignature(secret, body, 't=1,v1=' + '0'.repeat(64))).toBe(false);
  });

  it('allows empty secret', () => {
    expect(verifyUnifiedFikashopSignature('', 'body', '')).toBe(true);
  });
});
