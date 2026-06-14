import type { ApiResponse } from 'apisauce';
export type GatewayFailureContext = 'wallet' | 'subscription' | 'auto';
export declare function trimMessage(s: string, max?: number): string;
export declare function formatWalletFailure(resp: ApiResponse<unknown>): string;
export declare function formatSubscriptionFailure(resp: ApiResponse<unknown>): string;
/** Pick wallet vs subscription formatter; use after any gateway helper returns `!resp.ok`. */
export declare function formatGatewayFailure(resp: ApiResponse<unknown>, context?: GatewayFailureContext): string;
//# sourceMappingURL=errors.d.ts.map