import { type ApisauceInstance } from 'apisauce';
export type FikashopClientConfig = {
    baseUrl: string;
    getAccessToken: () => Promise<string | null>;
    partnerId?: string;
    timeoutMs?: number;
};
export type FikashopClient = ApisauceInstance & {
    configurePartner: (baseUrl: string | null | undefined, partnerId: string | null | undefined) => void;
};
export declare function createFikashopClient(config: FikashopClientConfig): FikashopClient;
//# sourceMappingURL=client.d.ts.map