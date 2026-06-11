import { create, type ApisauceInstance } from 'apisauce';

export type FikashopClientConfig = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  partnerId?: string;
  timeoutMs?: number;
};

export type FikashopClient = ApisauceInstance & {
  configurePartner: (baseUrl: string | null | undefined, partnerId: string | null | undefined) => void;
};

export function createFikashopClient(config: FikashopClientConfig): FikashopClient {
  const defaultBaseUrl = config.baseUrl.replace(/\/$/, '');
  const api = create({
    baseURL: defaultBaseUrl,
    headers: {
      'Content-Type': 'application/json',
      'X-Partner-Id': config.partnerId?.trim() ?? '',
    },
    timeout: config.timeoutMs ?? 15000,
  }) as FikashopClient;

  api.addAsyncRequestTransform(async (request) => {
    const token = await config.getAccessToken();
    if (token && request.headers) {
      request.headers.Authorization = `Bearer ${token}`;
    }
  });

  api.configurePartner = (baseUrl, partnerId) => {
    const url = baseUrl?.trim();
    const pid = partnerId?.trim();
    if (url && pid) {
      api.setBaseURL(url.replace(/\/$/, ''));
      api.setHeaders({
        'Content-Type': 'application/json',
        'X-Partner-Id': pid,
      });
    } else {
      api.setBaseURL(defaultBaseUrl);
      api.setHeaders({
        'Content-Type': 'application/json',
        'X-Partner-Id': '',
      });
    }
  };

  return api;
}
