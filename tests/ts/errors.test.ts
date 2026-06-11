import { describe, expect, it } from 'vitest';
import { formatWalletFailure, trimMessage } from '../../packages/ts/src/errors';

describe('errors', () => {
  it('trimMessage truncates long strings', () => {
    expect(trimMessage('a'.repeat(300), 10)).toBe(`${'a'.repeat(10)}…`);
  });

  it('formatWalletFailure handles network error', () => {
    const msg = formatWalletFailure({ problem: 'NETWORK_ERROR', status: null, data: null } as never);
    expect(msg).toContain('Cannot reach wallet service');
  });

  it('formatWalletFailure parses DRF detail', () => {
    const msg = formatWalletFailure({
      problem: 'CLIENT_ERROR',
      status: 400,
      data: { detail: 'Invalid amount' },
    } as never);
    expect(msg).toContain('Invalid amount');
  });
});
