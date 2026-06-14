function parseDrfDetail(data) {
    if (data == null)
        return '';
    if (typeof data === 'string')
        return data.trim().slice(0, 300);
    if (typeof data !== 'object')
        return '';
    const d = data;
    const detail = d.detail;
    if (typeof detail === 'string')
        return detail;
    if (Array.isArray(detail)) {
        return detail
            .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
            .join(' ')
            .slice(0, 300);
    }
    if (typeof d.message === 'string')
        return d.message;
    return '';
}
export function trimMessage(s, max = 280) {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : `${t.slice(0, max)}…`;
}
export function formatWalletFailure(resp) {
    const problem = resp.problem;
    if (problem === 'NETWORK_ERROR') {
        return 'Cannot reach wallet service. Check your network and that your profile includes wallet billing settings.';
    }
    if (problem === 'TIMEOUT_ERROR')
        return 'Request timed out.';
    if (problem === 'CONNECTION_ERROR')
        return 'Connection error while contacting wallet service.';
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
export function formatSubscriptionFailure(resp) {
    const problem = resp.problem;
    if (problem === 'NETWORK_ERROR') {
        return 'Cannot reach subscription service. Check network and partner scope (X-Partner-Id).';
    }
    if (problem === 'TIMEOUT_ERROR')
        return 'Subscription request timed out.';
    const detail = parseDrfDetail(resp.data);
    const status = resp.status;
    if (status === 401 || status === 403) {
        return trimMessage(`${detail || 'Session rejected.'} Use end-user OIDC token, not admin token.`);
    }
    if (status === 402) {
        return trimMessage(detail || 'Insufficient wallet balance for this subscription action.');
    }
    return trimMessage(detail || `Subscription request failed${status != null ? ` (${status})` : ''}.`);
}
/** Pick wallet vs subscription formatter; use after any gateway helper returns `!resp.ok`. */
export function formatGatewayFailure(resp, context = 'auto') {
    const status = resp.status;
    const data = resp.data;
    const featureCode = data && typeof data === 'object' ? data.feature_code : undefined;
    if (context === 'subscription' || status === 402 || featureCode != null) {
        return formatSubscriptionFailure(resp);
    }
    if (context === 'wallet') {
        return formatWalletFailure(resp);
    }
    if (status === 429 || status === 403 || status === 401) {
        return formatSubscriptionFailure(resp);
    }
    return formatWalletFailure(resp);
}
//# sourceMappingURL=errors.js.map