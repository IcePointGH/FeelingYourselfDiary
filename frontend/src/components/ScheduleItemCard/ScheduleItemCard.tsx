import type { ScheduleItem } from '../../types';
import { getFeelingClass } from '../../utils/feeling';
import { formatFeelingValue } from '../../utils/feeling';
import './ScheduleItemCard.css';

interface ScheduleItemCardProps {
  item: ScheduleItem;
  onDelete?: (id: number) => void;
  onClick?: (item: ScheduleItem) => void;
  showActions?: boolean;
  showDate?: boolean;
}

export default function ScheduleItemCard({
  item,
  onDelete,
  onClick,
  showActions = true,
  showDate = true,
}: ScheduleItemCardProps) {
  return (
    <div
      className="schedule-item"
      onClick={onClick ? () => onClick(item) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } } : undefined}
    >
      <div className="schedule-info">
        <div className="schedule-title">{item.title}</div>
        {item.description && <div className="schedule-desc">{item.description}</div>}
        <div className="schedule-meta">
          <span>
            {showDate && <>{item.date} </>}
            {item.time}
          </span>
          <span className={`feeling-badge ${getFeelingClass(item.feeling)}`}>
            {formatFeelingValue(item.feeling)}
          </span>
        </div>
      </div>
      {showActions && onDelete && (
        <button
          className="delete-btn-small"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          title="删除"
        >
          <i className="fas fa-trash" />
        </button>
      )}
    </div>
  );
}
