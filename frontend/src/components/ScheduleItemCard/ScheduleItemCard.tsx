import { useState, memo } from 'react';
import type { ScheduleItem, FeelingValue } from '../../types';
import { formatFeelingValue } from '../../utils/feeling';
import './ScheduleItemCard.css';

/**
 * Format ISO date string (YYYY-MM-DD) to Chinese format (YYYY年M月D日)
 */
function formatDateChinese(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

const FEELINGS = [-3, -2, -1, 0, 1, 2, 3] as const;

interface ScheduleItemCardProps {
  item: ScheduleItem;
  onDelete?: (id: number) => void;
  onClick?: (item: ScheduleItem) => void;
  onToggleComplete?: (id: number) => void;
  onUpdate?: (id: number, data: { title: string; description: string; date: string; time: string; feeling: FeelingValue }) => void;
  showActions?: boolean;
  showDate?: boolean;
  saving?: boolean;
  justAdded?: boolean;
}

/** Shallow-compare item fields that affect rendering — skip re-render if unchanged.
 *  NOTE: intentionally does NOT compare callback props (onDelete/onUpdate/etc)
 *  because they are recreated on every parent render. The callbacks are functionally
 *  equivalent even with different references. */
function arePropsEqual(
  prev: ScheduleItemCardProps,
  next: ScheduleItemCardProps,
): boolean {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.description === b.description &&
    a.date === b.date &&
    a.time === b.time &&
    a.feeling === b.feeling &&
    a.completed === b.completed &&
    prev.showActions === next.showActions &&
    prev.showDate === next.showDate &&
    prev.saving === next.saving &&
    prev.justAdded === next.justAdded
  );
}

function ScheduleItemCard({
  item,
  onDelete,
  onClick,
  onToggleComplete,
  onUpdate,
  showActions = true,
  showDate = true,
  saving = false,
  justAdded = false,
}: ScheduleItemCardProps) {
  // String comparison on YYYY-MM-DD is timezone-safe (Date object comparison is not)
  const isFuture = item.date > new Date().toISOString().split('T')[0];
  const [showFutureConfirm, setShowFutureConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description ?? '');
  const [editDate, setEditDate] = useState(item.date);
  const [editTime, setEditTime] = useState(item.time ?? '');
  const [editFeeling, setEditFeeling] = useState(item.feeling);

  /** 勾选框点击：未来+未完成→弹确认窗，否则直接切换 */
  const handleCheckToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    if (isFuture && !item.completed) {
      setShowFutureConfirm(true);
    } else {
      onToggleComplete?.(item.id);
    }
  };

  const handleConfirmToggle = () => {
    setShowFutureConfirm(false);
    onToggleComplete?.(item.id);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(item.title);
    setEditDesc(item.description ?? '');
    setEditDate(item.date);
    setEditTime(item.time ?? '');
    setEditFeeling(item.feeling);
    setEditing(true);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    onUpdate?.(item.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      date: editDate,
      time: editTime,
      feeling: editFeeling,
    });
    setEditing(false);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  return (
    <>
      <div
        className={`schedule-item ${saving ? 'is-saving' : ''} ${justAdded ? `just-added feel${item.feeling >= 0 ? '-' : '--'}${Math.abs(item.feeling)}` : ''}`}
        onClick={onClick && !saving ? () => onClick(item) : undefined}
        role={onClick && !saving ? 'button' : undefined}
        tabIndex={onClick && !saving ? 0 : undefined}
        aria-busy={saving || undefined}
        onKeyDown={onClick && !saving ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } } : undefined}
      >
        <div
          className={`schedule-checkbox ${item.completed ? 'checked' : ''}`}
          title={item.completed ? '已完成' : isFuture ? '待办，勾选后计入情绪统计' : '未完成'}
          onClick={handleCheckToggle}
          role="checkbox"
          aria-checked={item.completed}
          aria-disabled={saving || undefined}
          tabIndex={saving ? -1 : 0}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (saving) return; if (isFuture && !item.completed) { setShowFutureConfirm(true); } else { onToggleComplete?.(item.id); } } }}
        >
          <span className="checkmark" />
        </div>
        <div className="schedule-info">
          <div className="schedule-title">{item.title}</div>
          {item.description && <div className="schedule-desc">{item.description}</div>}
          <div className="schedule-meta">
            {showDate && (
              <span className="schedule-date">{formatDateChinese(item.date)}</span>
            )}
            {item.time && <span className="schedule-time">{item.time.slice(0, 5)}</span>}
            <span className={`feeling-badge feel${item.feeling >= 0 ? '-' : '--'}${Math.abs(item.feeling)}`}>
              {formatFeelingValue(item.feeling)}
            </span>
          </div>
        </div>
        {saving ? (
          <div className="saving-indicator" aria-label="保存中">
            <span className="saving-spinner" />
            <span>保存中</span>
          </div>
        ) : showActions && (
          <div className="card-actions">
            {onUpdate && (
              <button className="action-btn edit-btn" onClick={startEdit} title="编辑">
                <i className="fas fa-pen" />
              </button>
            )}
            {onDelete && (
              <button className="action-btn delete-btn-small" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} title="删除">
                <i className="fas fa-trash" />
              </button>
            )}
          </div>
        )}

        {/* 未来日程勾选确认弹窗 */}
        {showFutureConfirm && (
          <div className="future-confirm-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="future-confirm-popup">
              <p>这是一个<strong>未来的日程</strong>，勾选后会计入当前情绪统计。</p>
              <div className="future-confirm-actions">
                <button className="btn btn-cancel" onClick={() => setShowFutureConfirm(false)}>取消</button>
                <button className="btn submit-btn" onClick={handleConfirmToggle}>确定勾选</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 — 渲染在 .schedule-item 外部，避免其 CSS transition/hover 干扰 fixed overlay */}
      {editing && (
        <div className="edit-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="edit-popup" onClick={(e) => e.stopPropagation()}>
            <h3>编辑日程</h3>
            <div className="form-group">
              <label>事项 *</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="事项" required />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="描述（可选）" rows={3} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>日期</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>时间</label>
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>情绪</label>
              <div className="feeling-quick">
                {FEELINGS.map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`feeling-quick-btn ${editFeeling === f ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setEditFeeling(f); }}
                  >
                    {f > 0 ? `+${f}` : `${f}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="edit-actions">
              <button className="btn btn-cancel" onClick={cancelEdit}>取消</button>
              <button className="btn submit-btn" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ScheduleItemCard, arePropsEqual);
