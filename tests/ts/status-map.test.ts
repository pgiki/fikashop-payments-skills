import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PENDING_STATUSES,
  SUCCESS_STATUSES,
  WEBHOOK_STATUS_MAP,
} from '../../packages/ts/src/payment-fields';

const statusMapPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../contracts/status-map.json',
);
const statusMap = JSON.parse(readFileSync(statusMapPath, 'utf8')) as {
  webhook_normalize: Record<string, string>;
  client_success: string[];
  client_pending: string[];
};

describe('status-map contract', () => {
  it('WEBHOOK_STATUS_MAP matches contracts/status-map.json', () => {
    expect(WEBHOOK_STATUS_MAP).toEqual(statusMap.webhook_normalize);
  });

  it('SUCCESS_STATUSES matches contracts/status-map.json', () => {
    expect([...SUCCESS_STATUSES].sort()).toEqual([...statusMap.client_success].sort());
  });

  it('PENDING_STATUSES matches contracts/status-map.json', () => {
    expect([...PENDING_STATUSES].sort()).toEqual([...statusMap.client_pending].sort());
  });
});
