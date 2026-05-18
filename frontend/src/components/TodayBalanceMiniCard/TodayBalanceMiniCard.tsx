import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayBalance } from '../../contexts/TodayBalanceContext';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';
import './TodayBalanceMiniCard.css';

export default function TodayBalanceMiniCard({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { total, status, loading } = useTodayBalance();

  const statusText = status === '沉' ? '偏沉' : status === '轻' ? '偏轻' : '平衡';
  const clamped = Math.max(-3, Math.min(3, total));
  const weather = {
    [-3]: 'snow',
    [-2]: 'heavy-rain',
    [-1]: 'light-rain',
    [0]: 'breeze',
    [1]: 'cloud',
    [2]: 'sun-cloud',
    [3]: 'sun',
  }[clamped];

  return (
    <button
      type="button"
      className={`today-balance-mini ${collapsed ? 'collapsed' : ''}`}
      onClick={() => navigate('/schedule')}
      style={{
        '--today-balance-color': getMoodColor(clamped),
      } as CSSProperties}
    >
      <span className="today-balance-mini-label">今日平衡</span>
      <strong>{loading ? '…' : formatFeelingValue(total)}</strong>
      <em>{loading ? '加载中' : statusText}</em>
      <i className={`weather-icon weather-${weather}`} aria-hidden="true" />
    </button>
  );
}
