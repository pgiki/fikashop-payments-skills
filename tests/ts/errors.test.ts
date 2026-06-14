import { describe, expect, it } from 'vitest';
import { formatGatewayFailure, formatSubscriptionFailure, formatWalletFailure, trimMessage } from '../../packages/ts/src/errors';

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

  it('formatGatewayFailure routes 402 to subscription formatter', () => {
    const msg = formatGatewayFailure({
      problem: 'CLIENT_ERROR',
      status: 402,
      data: { detail: 'Insufficient wallet balance' },
    } as never);
    expect(msg).toContain('Insufficient wallet');
  });

  it('formatSubscriptionFailure warns about admin token on 403', () => {
    const msg = formatSubscriptionFailure({
      problem: 'CLIENT_ERROR',
      status: 403,
      data: { detail: 'Forbidden' },
    } as never);
    expect(msg.toLowerCase()).toContain('token');
  });
});
