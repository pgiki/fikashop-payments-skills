import { describe, expect, it } from 'vitest';
import { parsePartnerList } from '../../packages/ts/src/gateway';

describe('gateway', () => {
  it('parsePartnerList reads paginated results', () => {
    const data = {
      results: [
        { id: 1, code: 'shop-a', name: 'Shop A' },
        { id: 2, code: 'shop-b', name: 'Shop B' },
      ],
    };
    expect(parsePartnerList(data)).toHaveLength(2);
    expect(parsePartnerList(data)[0].code).toBe('shop-a');
  });

  it('parsePartnerList accepts bare array', () => {
    expect(parsePartnerList([{ id: 3, code: 'x', name: 'X' }])).toHaveLength(1);
  });
});
