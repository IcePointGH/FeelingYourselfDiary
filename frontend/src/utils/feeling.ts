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

/** Mood color palette — one color per feeling value (-3 to +3) */
export const MOOD_COLORS: Record<number, string> = {
  '-3': '#d75772',
  '-2': '#f5867b',
  '-1': '#fea979',
   '0': '#ffe062',
   '1': '#3cdfe9',
   '2': '#12b8ec',
   '3': '#1686ee',
};

/** Get the hex color for a given feeling value.
 *  Values outside [-3, 3] are rounded and clamped so totals and
 *  averages never fall through to the fallback gray. */
export function getMoodColor(value: number): string {
  const rounded = Math.round(value);
  const clamped = Math.max(-3, Math.min(3, rounded));
  return MOOD_COLORS[clamped] ?? '#454545';
}

/** Get a lighter background variant of the mood color (for badges, calendar days, etc.) */
export function getMoodBgColor(value: number): string {
  const hex = getMoodColor(value);
  // Append ~40% alpha for subtle backgrounds
  return hex + '26';
}
