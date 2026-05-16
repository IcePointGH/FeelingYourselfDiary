import { useState, useCallback, useMemo } from 'react';

/**
 * useFieldValidation — touched-state inline validation for forms.
 *
 * Rules:
 *  - untouched field returns no error
 *  - touched field runs its validator; null = valid
 *  - validateAll() touches every field and returns hasErrors
 */
export function useFieldValidation<T extends Record<string, unknown>>(
  values: T,
  validators: { [K in keyof T]?: (value: T[K]) => string | null },
) {
  type Field = keyof T;

  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const errors = useMemo(() => {
    const errs: Partial<Record<Field, string | null>> = {};
    for (const key of Object.keys(values) as Field[]) {
      if (!touched[key]) {
        errs[key] = null;
        continue;
      }
      const fn = validators[key];
      errs[key] = fn ? fn(values[key]) : null;
    }
    return errs;
  }, [values, touched, validators]);

  const touchField = useCallback((field: Field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback((): boolean => {
    const allFields = Object.keys(values) as Field[];
    setTouched((prev) => {
      const next = { ...prev };
      for (const f of allFields) next[f] = true;
      return next;
    });
    // Compute sync — validators are pure, values are current
    const hasError = allFields.some((f) => {
      const fn = validators[f];
      return fn ? fn(values[f]) !== null : false;
    });
    return hasError;
  }, [values, validators]);

  const hasErrors = useMemo(
    () => Object.values(errors).some((e) => e !== null && e !== undefined),
    [errors],
  );

  return { touched, errors, touchField, validateAll, hasErrors };
}

/* ── Convenience validators ── */

export function required(msg = '此项不能为空') {
  return (v: unknown): string | null => {
    if (v === undefined || v === null) return msg;
    if (typeof v === 'string' && v.trim() === '') return msg;
    return null;
  };
}

export function minLength(n: number, msg?: string) {
  return (v: string): string | null => {
    if (typeof v !== 'string' || v.trim().length < n) {
      return msg ?? `至少需要 ${n} 个字符`;
    }
    return null;
  };
}

export function matchField(otherValue: string, msg = '两次输入不一致') {
  return (v: string): string | null => (v !== otherValue ? msg : null);
}
