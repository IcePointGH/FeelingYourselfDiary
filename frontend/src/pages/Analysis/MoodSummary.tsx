import { useMemo } from 'react';
import type { ScheduleItem } from '../../types';
import { formatFeelingValue } from '../../utils/feeling';

interface MoodSummaryProps {
  tab: 'daily' | 'weekly' | 'monthly';
  items?: ScheduleItem[];
}

export default function MoodSummary({ tab, items }: MoodSummaryProps) {
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) return null;
    if (tab === 'daily') return { '': items };
    const groups: Record<string, ScheduleItem[]> = {};
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    }
    return groups;
  }, [items, tab]);

  if (!items || items.length === 0) {
    return (
      <div className="card details-section">
        <h2>事项详情</h2>
        <div className="details-empty">暂无事项记录</div>
      </div>
    );
  }

  return (
    <div className="card details-section">
      <h2>事项详情</h2>
      {groupedItems && Object.entries(groupedItems).map(([dateKey, groupItems]) => (
        <div key={dateKey || 'daily'} className="details-group">
          {dateKey && <div className="details-date-title">{dateKey}</div>}
          <div className="details-list">
            {groupItems.map(item => (
              <div key={item.id} className="detail-item">
                <div className="detail-info">
                  <div className="detail-title">{item.title}</div>
                  <div className="detail-time">
                    {item.date}{item.time ? ` ${item.time}` : ''}
                  </div>
                </div>
                <div className={`detail-feeling ${item.feeling > 0 ? 'positive' : item.feeling < 0 ? 'negative' : 'neutral'}`}>
                  {formatFeelingValue(item.feeling)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
