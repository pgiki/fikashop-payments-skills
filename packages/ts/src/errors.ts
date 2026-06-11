import type { ApiResponse } from 'apisauce';

function parseDrfDetail(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim().slice(0, 300);
  if (typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const detail = d.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
      .join(' ')
      .slice(0, 300);
  }
  if (typeof d.message === 'string') return d.message;
  return '';
}

export function trimMessage(s: string, max = 280): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function formatWalletFailure(resp: ApiResponse<unknown>): string {
  const problem = resp.problem;
  if (problem === 'NETWORK_ERROR') {
    return 'Cannot reach wallet service. Check your network and that your profile includes wallet billing settings.';
  }
  if (problem === 'TIMEOUT_ERROR') return 'Request timed out.';
  if (problem === 'CONNECTION_ERROR') return 'Connection error while contacting wallet service.';
  const detail = parseDrfDetail(resp.data);
  const status = resp.status;
  if (status === 401 || status === 403) {
    return trimMessage(`${detail || 'Wallet service rejected your session.'} Try signing out and back in.`);
  }
  if (status === 404) {
    return trimMessage(detail || 'Wallet API path was not found on this server.');
  }
  return trimMessage(detail || `Request failed${status != null ? ` (${status})` : ''}.`);
}
