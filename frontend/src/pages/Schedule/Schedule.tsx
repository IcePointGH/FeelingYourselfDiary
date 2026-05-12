import { useState, useEffect, useRef, useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useFeelingMode } from '../../hooks/useFeelingMode';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import FeelingSelector from '../../components/FeelingSelector/FeelingSelector';
import ScheduleItemCard from '../../components/ScheduleItemCard/ScheduleItemCard';
import { SCHEDULE_API } from '../../services/api';
import { KAOMOJI, DEFAULT_KAOMOJI, getFeelingClass } from '../../utils/feeling';
import type { ScheduleItem } from '../../types';
import './Schedule.css';

const quotes = [
  '成功不是终点，失败也不是末日，最重要的是继续前进的勇气。',
  '每一天都是一个新的开始，把握当下，活出精彩。',
  '情绪是内心的天气，学会观察它，但不被它左右。',
  '记录此刻的感受，是对自己最好的温柔。',
  '接纳所有的情绪，它们都是你真实的一部分。',
];

const REMINDER_KEY = 'schedule_future_reminder_dismissed';

export default function SchedulePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [feeling, setFeeling] = useState<number>(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [kaoAnimKey, setKaoAnimKey] = useState(0);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const { mode } = useFeelingMode();
  const [showDesc, setShowDesc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // 批量操作
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(scheduleList.map(it => it.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const batchToggle = async (completed: boolean) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      } catch { /* 继续下一个 */ }
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    refetch();
  };
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.max(120, ta.scrollHeight) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [description, autoResize]);

  const { data: items, error, refetch } = useFetch<ScheduleItem[]>(
    () => apiFetch(SCHEDULE_API.byDate(date)),
    [apiFetch, date]
  );

  // 本地乐观更新镜像：勾选时立即更新 UI，后台 API 同步
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
  useEffect(() => {
    if (items) setScheduleList(items);
  }, [items]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const handleFeelingChange = useCallback((val: number) => {
    setFeeling(val);
    setHasInteracted(true);
    setKaoAnimKey(prev => prev + 1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查是否为未来日期，且用户未勾选"不再提示"
    const isFutureDate = date > new Date().toISOString().split('T')[0];
    if (isFutureDate && !localStorage.getItem(REMINDER_KEY)) {
      setShowFutureReminder(true);
      setDontShowAgain(false);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    try {
      await apiFetch(SCHEDULE_API.base, {
        method: 'POST',
        body: JSON.stringify({ title, description, date, time, feeling }),
      });
      setTitle('');
      setDescription('');
      setFeeling(0);
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '添加日程失败', 'error');
    }
  };

  const confirmFutureReminder = () => {
    if (dontShowAgain) {
      localStorage.setItem(REMINDER_KEY, '1');
    }
    setShowFutureReminder(false);
    doSubmit();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleToggleComplete = async (id: number) => {
    // 乐观更新：立即翻转本地状态
    setScheduleList(prev => prev.map(it =>
      it.id === id ? { ...it, completed: !it.completed } : it
    ));
    try {
      await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      // 后台静默刷新确保数据一致
      refetch();
    } catch (err) {
      // 失败时回滚
      setScheduleList(prev => prev.map(it =>
        it.id === id ? { ...it, completed: !it.completed } : it
      ));
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const displayKao = hasInteracted ? KAOMOJI[feeling] ?? DEFAULT_KAOMOJI : DEFAULT_KAOMOJI;
  const kaoMood = hasInteracted ? getFeelingClass(feeling) : 'positive';

  return (
    <div className="schedule-page">
      <h2 className="schedule-page-title">添加新日程</h2>
      <div className="daily-quote">{quote}</div>

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>事项 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="记录今天发生的事情"
              required
            />
          </div>

          <div className="datetime-compact">
            <DateInput value={date} onChange={v => setDate(v)} required />
            <span className="time-divider">·</span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          {/* Unified feeling area — slider has its own kaomoji, buttons get one here */}
          <div className="feeling-area">
            {mode === 'buttons' && (
              <>
                <span className="feeling-area-kaomoji" key={kaoAnimKey}>{displayKao}</span>
                <span className="feeling-area-hint">
                  {hasInteracted ? '此刻的感受' : '你的心情是...'}
                </span>
              </>
            )}
            <FeelingSelector value={feeling} onChange={handleFeelingChange} mode={mode} />
          </div>

          {/* Collapsible description */}
          <button
            type="button"
            className="desc-toggle"
            onClick={() => setShowDesc(!showDesc)}
          >
            <i className={`fas fa-${showDesc ? 'minus' : 'plus'}-circle`} />
            <span>添加描述{description && !showDesc ? ` (已输入)` : ''}</span>
          </button>
          {showDesc && (
            <div className="form-group desc-expanded">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="在这里记录你的感受..."
                rows={4}
              />
            </div>
          )}

          <button type="submit" className="btn submit-btn">添加日程</button>
        </form>
      </div>

      <div className="card list-card">
        <div className="list-card-header">
          <h2>当日记录</h2>
          {scheduleList.length > 0 && (
            <button
              className={`btn-batch-toggle ${batchMode ? 'active' : ''}`}
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            >
              <i className="fas fa-check-double" />
              {batchMode ? '退出批量' : '批量操作'}
            </button>
          )}
        </div>
        {scheduleList.length === 0 ? (
          <p className="empty-text">今天还没有记录，添加第一条吧～</p>
        ) : (
          <div className="schedule-list">
            {scheduleList.map(item => (
              <div key={item.id} className="schedule-item-row">
                {batchMode && (
                  <div
                    className={`batch-select-box ${selectedIds.has(item.id) ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  >
                    {selectedIds.has(item.id) ? <i className="fas fa-check" /> : null}
                  </div>
                )}
                <ScheduleItemCard
                  item={item}
                  onDelete={batchMode ? undefined : handleDelete}
                  onToggleComplete={batchMode ? undefined : handleToggleComplete}
                />
              </div>
            ))}
          </div>
        )}

        {/* 批量操作浮动栏 */}
        {batchMode && selectedIds.size > 0 && (
          <div className="batch-bar">
            <button className="btn btn-text" onClick={selectAll}>全选</button>
            <button className="btn btn-text" onClick={deselectAll}>取消选择</button>
            <span className="batch-count">已选 {selectedIds.size} 项</span>
            <button className="btn submit-btn" onClick={() => batchToggle(true)}>批量完成</button>
            <button className="btn btn-cancel" onClick={() => batchToggle(false)}>批量取消</button>
          </div>
        )}
      </div>

      {/* 未来日程提醒弹窗 */}
      {showFutureReminder && (
        <div className="future-reminder-overlay" onClick={() => setShowFutureReminder(false)}>
          <div className="future-reminder-card" onClick={(e) => e.stopPropagation()}>
            <div className="future-reminder-icon">
              <i className="fas fa-calendar-alt" />
            </div>
            <p className="future-reminder-text">
              您选择的是未来的日期，该日程将作为<strong>待办事项</strong>，默认不勾选，不计入当前情绪统计。
            </p>
            <p className="future-reminder-sub">
              可在日程卡片左侧勾选完成，勾选后计入情绪分析。
            </p>
            <label className="future-reminder-check">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span>之后不再提示</span>
            </label>
            <button className="btn submit-btn" onClick={confirmFutureReminder}>
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
