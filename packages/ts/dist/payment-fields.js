// Keep in sync with contracts/status-map.json (validated in tests/ts/status-map.test.ts).
export const SUCCESS_STATUSES = new Set([
    'confirmed',
    'success',
    'settled',
    'paid',
    'completed',
    'succeeded',
]);
export const PENDING_STATUSES = new Set(['waiting', 'pending', 'processing', 'preauth']);
export const WEBHOOK_STATUS_MAP = {
    open: 'pending',
    pending: 'pending',
    processing: 'pending',
    unpaid: 'pending',
    preauth: 'pending',
    paid: 'paid',
    settled: 'paid',
    succeeded: 'paid',
    success: 'paid',
    completed: 'paid',
    confirmed: 'paid',
    failed: 'failed',
    failure: 'failed',
    error: 'failed',
    declined: 'failed',
    canceled: 'failed',
    cancelled: 'failed',
    void: 'failed',
    voided: 'failed',
};
export function normalizeWebhookStatus(value) {
    return WEBHOOK_STATUS_MAP[normalizeStatus(value)] ?? null;
}
export function normalizeStatus(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}
export function isRedirectStatus(value) {
    return normalizeStatus(value) === 'redirect';
}
export function filterDepositMethods(methods) {
    return methods.filter((m) => m.code !== 'wallet');
}
/** Normalize balance vs capture field shapes to canonical PaymentInputField. */
export function getInputFieldsForMethod(method) {
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
export function defaultFieldValues(fields) {
    const out = {};
    for (const f of fields) {
        const t = normalizeStatus(f.type);
        if (t === 'boolean' || t === 'checkbox') {
            out[f.code] = f.default_value === true || f.default_value === 'true';
        }
        else {
            out[f.code] =
                f.default_value != null && f.default_value !== '' ? String(f.default_value) : '';
        }
    }
    return out;
}
export function validateFieldValues(fields, values) {
    const errors = [];
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
            continue;
        }
        if (str && f.schema && typeof f.schema.pattern === 'string') {
            try {
                const re = new RegExp(f.schema.pattern);
                if (!re.test(str)) {
                    errors.push({ code: f.code, message: `${label} format is invalid` });
                }
            }
            catch {
                // ignore invalid schema.pattern in API payload
            }
        }
    }
    return errors;
}
export function buildCapturePayload(inputFields) {
    return { action: 'capture', input_fields: inputFields };
}
export function buildDepositPayload(input) {
    const payload = {
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
export function parseInvoiceList(data) {
    if (!data || typeof data !== 'object')
        return [];
    const d = data;
    if (Array.isArray(d.results))
        return d.results;
    if (Array.isArray(data))
        return data;
    return [];
}
//# sourceMappingURL=payment-fields.js.map