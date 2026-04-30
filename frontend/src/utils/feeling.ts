export function getFeelingClass(val: number): string {
  if (val < 0) return 'negative';
  if (val > 0) return 'positive';
  return 'neutral';
}

export function formatFeelingValue(value: number): string {
  if (value === 0) return '0';
  if (value > 0) return '+' + value;
  return String(value);
}

export const KAOMOJI: Record<number, string> = {
  '-3': '(\u2A4C\uFE4F\u2A4C)',
  '-2': '(\u2565\uFE4F\u2565)',
  '-1': '(\uFF1B\uFE4F\uFF1B)',
   '0': '(\u3002-\u03C9-\u3002)',
   '1': '(\uFF61\uFF65\u03C9\uFF65\uFF61)',
   '2': '(\u25E0\u203F\u25E0)',
   '3': '(\u2267\u25BD\u2266)',
};

/** Default display kaomoji when no selection has been made (welcome state) */
export const DEFAULT_KAOMOJI = KAOMOJI['3'];

export const FEELING_VALUES = [-3, -2, -1, 0, 1, 2, 3] as const;
