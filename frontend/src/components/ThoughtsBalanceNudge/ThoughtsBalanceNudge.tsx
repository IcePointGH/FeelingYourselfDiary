import { useNavigate } from 'react-router-dom';
import { useTodayBalance } from '../../contexts/TodayBalanceContext';
import './ThoughtsBalanceNudge.css';

export default function ThoughtsBalanceNudge() {
  const navigate = useNavigate();
  const { nudge } = useTodayBalance();

  if (!nudge) return null;

  return (
    <aside className="thoughts-balance-nudge">
      <span>今天目前有些偏沉。写完之后，要不要也给晚上留一点恢复时间？</span>
      <button type="button" onClick={() => navigate('/schedule')}>
        去添加一项支撑
      </button>
    </aside>
  );
}
