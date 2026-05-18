import { useMemo } from 'react';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';
import type { ScheduleItem } from '../../types';
import BalanceScaleCanvas from './BalanceScaleCanvas';
import { buildDailyBalanceState } from '../../utils/dailyBalance';
import './DailyBalanceScale.css';

type DailyBalanceScaleProps = {
  items: ScheduleItem[];
  onAddSupport?: () => void;
};

export default function DailyBalanceScale({ items, onAddSupport }: DailyBalanceScaleProps) {
  const feelingValues = items.map(item => item.feeling);
  const positiveValues = feelingValues.filter(value => value > 0);
  const negativeValues = feelingValues.filter(value => value < 0);
  const total = feelingValues.reduce((sum, value) => sum + value, 0);
  const model = useMemo(() => buildDailyBalanceState(total), [total]);

  const statusText =
    model.status === '沉'
      ? '今天目前有些偏沉'
      : model.status === '轻'
        ? '今天目前被一些支撑轻轻托起'
        : '今天目前接近平衡';

  return (
    <section className="daily-balance card is-horizontal" aria-label="今日情绪平衡">
      <div className="daily-balance-sidebar">
        <div className="daily-balance-copy">
          <small>今天目前</small>
          <strong style={{ color: getMoodColor(total) }}>{formatFeelingValue(total)}</strong>
          <p>{statusText}</p>
        </div>

        {model.nudge && (
          <aside className="daily-balance-note">
            <span>今天还没有结束。要不要给晚上留一点恢复时间？</span>
            {onAddSupport && (
              <button type="button" onClick={onAddSupport}>
                添加一项支撑
              </button>
            )}
          </aside>
        )}
      </div>

      <BalanceScaleCanvas total={total} positiveValues={positiveValues} negativeValues={negativeValues} />
    </section>
  );
}
