export type DailyBalanceStatus = '沉' | '平' | '轻';

export type DailyBalanceState = {
  clamped: number;
  tilt: number;
  markerOffset: number;
  leftIntensity: number;
  rightIntensity: number;
  status: DailyBalanceStatus;
  nudge: boolean;
};

export function buildDailyBalanceState(total: number): DailyBalanceState {
  const clamped = Math.max(-6, Math.min(6, total));
  const magnitude = Math.abs(clamped);

  return {
    clamped,
    tilt: clamped * 0.055,
    markerOffset: clamped * 18,
    leftIntensity: clamped < 0 ? 0.55 + magnitude * 0.075 : 0.3,
    rightIntensity: clamped > 0 ? 0.55 + magnitude * 0.075 : 0.3,
    status: clamped < -1 ? '沉' : clamped > 1 ? '轻' : '平',
    nudge: total <= -3,
  };
}
