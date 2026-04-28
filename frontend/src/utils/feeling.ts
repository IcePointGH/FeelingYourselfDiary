export function getFeelingClass(val: number): string {
  if (val < 0) return 'negative';
  if (val > 0) return 'positive';
  return 'neutral';
}

export function formatFeelingValue(value: number): string {
  if (value === 0) return '0';
  if (value > 0) return `+${value}`;
  return `${value}`;
}
