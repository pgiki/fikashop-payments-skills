import { describe, expect, it } from 'vitest';
import {
  buildCapturePayload,
  buildDepositPayload,
  defaultFieldValues,
  filterDepositMethods,
  getInputFieldsForMethod,
  isRedirectStatus,
  validateFieldValues,
} from '../../packages/ts/src/payment-fields';
import type { PaymentMethod } from '../../packages/ts/src/types';

describe('payment-fields', () => {
  it('filterDepositMethods excludes wallet', () => {
    const methods: PaymentMethod[] = [
      { code: 'wallet', name: 'Wallet' },
      { code: 'mpesa', name: 'M-Pesa' },
    ];
    expect(filterDepositMethods(methods).map((m) => m.code)).toEqual(['mpesa']);
  });

  it('normalizes legacy name/required to code/is_required', () => {
    const method: PaymentMethod = {
      code: 'mpesa',
      name: 'M-Pesa',
      input_fields: [{ name: 'billing_phone', label: 'Phone', required: true, type: 'text' }],
    };
    const fields = getInputFieldsForMethod(method);
    expect(fields[0].code).toBe('billing_phone');
    expect(fields[0].is_required).toBe(true);
  });

  it('defaultFieldValues handles boolean and text', () => {
    const fields = getInputFieldsForMethod({
      code: 'card',
      name: 'Card',
      input_fields: [
        { code: 'billing_phone', label: 'Phone', type: 'text', is_required: true },
        { code: 'accept', label: 'Accept', type: 'checkbox', is_required: true, default_value: true },
      ],
    });
    expect(defaultFieldValues(fields)).toEqual({ billing_phone: '', accept: true });
  });

  it('validateFieldValues requires text and boolean fields', () => {
    const fields = getInputFieldsForMethod({
      code: 'card',
      name: 'Card',
      input_fields: [
        { code: 'billing_phone', label: 'Phone', type: 'text', is_required: true },
        { code: 'accept', label: 'Accept', type: 'checkbox', is_required: true },
      ],
    });
    const errors = validateFieldValues(fields, { billing_phone: '', accept: false });
    expect(errors).toHaveLength(2);
  });

  it('buildCapturePayload uses field codes', () => {
    const payload = buildCapturePayload({ billing_phone: '+2557', accept_terms: true });
    expect(payload).toEqual({
      action: 'capture',
      input_fields: { billing_phone: '+2557', accept_terms: true },
    });
  });

  it('buildDepositPayload includes variant and input_fields', () => {
    expect(
      buildDepositPayload({
        total: '100.00',
        variant: 'mpesa',
        currency: 'TZS',
        inputFields: { billing_phone: '+255' },
      }),
    ).toMatchObject({
      total: '100.00',
      variant: 'mpesa',
      input_fields: { billing_phone: '+255' },
    });
  });

  it('isRedirectStatus is case insensitive', () => {
    expect(isRedirectStatus('Redirect')).toBe(true);
    expect(isRedirectStatus('paid')).toBe(false);
  });
});
