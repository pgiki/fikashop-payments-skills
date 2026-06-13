import type { PaymentFormValues, PaymentInputField, PaymentMethod } from './types.js';
export declare const SUCCESS_STATUSES: Set<string>;
export declare const PENDING_STATUSES: Set<string>;
export type NormalizedWebhookStatus = 'paid' | 'pending' | 'failed';
export declare const WEBHOOK_STATUS_MAP: Record<string, NormalizedWebhookStatus>;
export declare function normalizeWebhookStatus(value: unknown): NormalizedWebhookStatus | null;
export declare function normalizeStatus(value: unknown): string;
export declare function isRedirectStatus(value: unknown): boolean;
export declare function filterDepositMethods(methods: PaymentMethod[]): PaymentMethod[];
/** Normalize balance vs capture field shapes to canonical PaymentInputField. */
export declare function getInputFieldsForMethod(method: PaymentMethod | null | undefined): PaymentInputField[];
export declare function defaultFieldValues(fields: PaymentInputField[]): PaymentFormValues;
export type FieldValidationError = {
    code: string;
    message: string;
};
export declare function validateFieldValues(fields: PaymentInputField[], values: PaymentFormValues): FieldValidationError[];
export declare function buildCapturePayload(inputFields: PaymentFormValues): {
    action: 'capture';
    input_fields: PaymentFormValues;
};
export declare function buildDepositPayload(input: {
    total: string;
    variant: string;
    currency: string;
    description?: string;
    inputFields?: PaymentFormValues;
}): Record<string, unknown>;
export declare function parseInvoiceList(data: unknown): import('./types.js').InvoiceListCardItem[];
//# sourceMappingURL=payment-fields.d.ts.map