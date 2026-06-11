import type { PaymentFormValues, PaymentInputField, PaymentMethod } from './types.js';

export const SUCCESS_STATUSES = new Set(['confirmed', 'success', 'settled', 'paid', 'completed']);
export const PENDING_STATUSES = new Set(['waiting', 'pending', 'processing', 'preauth']);

export function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function isRedirectStatus(value: unknown): boolean {
  return normalizeStatus(value) === 'redirect';
}

export function filterDepositMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.filter((m) => m.code !== 'wallet');
}

/** Normalize balance vs capture field shapes to canonical PaymentInputField. */
export function getInputFieldsForMethod(method: PaymentMethod | null | undefined): PaymentInputField[] {
  const raw = method?.input_fields ?? [];
  return raw.map((f) => {
    const code = (f.code || f.name || '').trim();
    return {
      code,
      label: f.label || code,
      type: f.type || 'text',
      is_required: Boolean(f.is_required ?? f.required),
      help_text: f.help_text ?? null,
      default_value: f.default_value,
      schema: f.schema ?? null,
    };
  });
}

export function defaultFieldValues(fields: PaymentInputField[]): PaymentFormValues {
  const out: PaymentFormValues = {};
  for (const f of fields) {
    const t = normalizeStatus(f.type);
    if (t === 'boolean' || t === 'checkbox') {
      out[f.code] = f.default_value === true || f.default_value === 'true';
    } else {
      out[f.code] =
        f.default_value != null && f.default_value !== '' ? String(f.default_value) : '';
    }
  }
  return out;
}

export type FieldValidationError = { code: string; message: string };

export function validateFieldValues(
  fields: PaymentInputField[],
  values: PaymentFormValues,
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  for (const f of fields) {
    const t = normalizeStatus(f.type);
    const label = f.label || f.code;
    if (t === 'boolean' || t === 'checkbox') {
      if (f.is_required && values[f.code] !== true) {
        errors.push({ code: f.code, message: `${label} is required` });
      }
      continue;
    }
    const v = values[f.code];
    const str = v == null ? '' : String(v).trim();
    if (f.is_required && !str) {
      errors.push({ code: f.code, message: `${label} is required` });
    }
  }
  return errors;
}

export function buildCapturePayload(inputFields: PaymentFormValues): {
  action: 'capture';
  input_fields: PaymentFormValues;
} {
  return { action: 'capture', input_fields: inputFields };
}

export function buildDepositPayload(input: {
  total: string;
  variant: string;
  currency: string;
  description?: string;
  inputFields?: Record<string, string>;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    total: input.total,
    variant: input.variant,
    currency: input.currency,
    description: input.description ?? 'Wallet top up',
  };
  if (input.inputFields && Object.keys(input.inputFields).length > 0) {
    payload.input_fields = input.inputFields;
  }
  return payload;
}

export function parseInvoiceList(data: unknown): import('./types.js').InvoiceListCardItem[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as { results?: import('./types.js').InvoiceListCardItem[] };
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(data)) return data as import('./types.js').InvoiceListCardItem[];
  return [];
}
