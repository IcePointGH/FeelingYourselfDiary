import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayBalance } from '../../contexts/TodayBalanceContext';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';
import './TodayBalancePill.css';

export default function TodayBalancePill() {
  const navigate = useNavigate();
  const { total, loading } = useTodayBalance();
  const clamped = Math.max(-3, Math.min(3, total));
  const fill = 50 + clamped * 12;

  return (
    <button
      type="button"
      className="today-balance-pill"
      onClick={() => navigate('/schedule')}
      style={{
        '--today-balance-color': getMoodColor(clamped),
        '--today-balance-fill': `${fill}%`,
      } as CSSProperties}
      aria-label="查看今日平衡"
    >
      <span className="today-balance-liquid" aria-hidden="true">
        <svg viewBox="0 0 240 24" preserveAspectRatio="none">
          <path d="M0 12 C40 5 80 5 120 12 S200 19 240 12 V24 H0 Z" />
        </svg>
      </span>
      <strong>{loading ? '…' : formatFeelingValue(total)}</strong>
    </button>
  );
}
