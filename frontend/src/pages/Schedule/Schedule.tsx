import { useState, useEffect, useRef, useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useDraft } from '../../hooks/useDraft';
import { useFieldValidation, required } from '../../hooks/useFieldValidation';
import { useFeelingMode } from '../../hooks/useFeelingMode';
import { useToast } from '../../contexts/ToastContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import DateInput from '../../components/DateInput/DateInput';
import FeelingSelector from '../../components/FeelingSelector/FeelingSelector';
import ScheduleItemCard from '../../components/ScheduleItemCard/ScheduleItemCard';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState/PageState';
import { SCHEDULE_API } from '../../services/api';
import { KAOMOJI, DEFAULT_KAOMOJI } from '../../utils/feeling';
import type { ScheduleItem, FeelingValue } from '../../types';
import './Schedule.css';

const quotes = [
  '成功不是终点，失败也不是末日，最重要的是继续前进的勇气。',
  '每一天都是一个新的开始，把握当下，活出精彩。',
  '情绪是内心的天气，学会观察它，但不被它左右。',
  '记录此刻的感受，是对自己最好的温柔。',
  '接纳所有的情绪，它们都是你真实的一部分。',
];

const REMINDER_KEY = 'schedule_future_reminder_dismissed';

type ScheduleListItem = ScheduleItem & {
  saving?: boolean;
  justAdded?: boolean;
  tempId?: number;
};

const sortScheduleItems = (items: ScheduleListItem[]): ScheduleListItem[] => {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const aTime = a.item.time || '99:99';
    const bTime = b.item.time || '99:99';
    const byTime = aTime.localeCompare(bTime);
    if (byTime !== 0) return byTime;
    return a.index - b.index;
  }).map(({ item }) => item);
};

const currentTimeValue = () => new Date().toTimeString().slice(0, 5);
const todayValue = () => new Date().toISOString().split('T')[0];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface ScheduleDraft {
  title: string;
  description: string;
  date: string;
  time: string;
  feeling: number;
  showDesc: boolean;
}

export default function SchedulePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayValue());
  const [time, setTime] = useState(currentTimeValue());
  const [feeling, setFeeling] = useState<number>(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [kaoAnimKey, setKaoAnimKey] = useState(0);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const { mode } = useFeelingMode();
  const [showDesc, setShowDesc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const tempIdRef = useRef(-1);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const { isActive: onboardingActive, state: onboardingState, markScheduleCreated } = useOnboarding();

  // ── Inline validation ──
  const { errors, touchField, validateAll } = useFieldValidation(
    { title },
    { title: required('请填写事项标题') },
  );

  // ── Draft persistence ──
  const { draft, hasDraft, save, clear, setCurrent, setDirty } = useDraft<ScheduleDraft>('schedule.create');
  const [draftDismissed, setDraftDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: watches form fields, saves after 1.5s of no changes
  // Skips saving when title is empty (don't save empty drafts)
  useEffect(() => {
    if (!title.trim()) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      save({
        title: title.trim(),
        description,
        date,
        time,
        feeling,
        showDesc,
      });
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [title, description, date, time, feeling, showDesc, save]);

  // Wire up beforeunload guard: setCurrent feeds the ref that useDraft compares
  const formDraft: ScheduleDraft = {
    title: title.trim(),
    description,
    date,
    time,
    feeling,
    showDesc,
  };
  setCurrent(formDraft);
  setDirty(title.trim() !== '' || description.trim() !== '' || feeling !== 0);

  const focusTitleInput = () => {
    requestAnimationFrame(() => titleInputRef.current?.focus({ preventScroll: true }));
  };

  const revealRowIfNeeded = (id: number) => {
    requestAnimationFrame(() => {
      const el = rowRefs.current[id];
      if (!el) {
        focusTitleInput();
        return;
      }
      const rect = el.getBoundingClientRect();
      const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!visible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(focusTitleInput, 350);
        return;
      }
      focusTitleInput();
    });
  };

  // 批量操作
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastAnchor, setLastAnchor] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{
    message: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);

  const handleSelectItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;

    // Shift+click: select range from lastAnchor to clicked item
    if (isShift && lastAnchor !== null) {
      const visibleIds = scheduleList.filter(it => !it.saving).map(it => it.id);
      const anchorIdx = visibleIds.indexOf(lastAnchor);
      const clickIdx = visibleIds.indexOf(id);
      if (anchorIdx !== -1 && clickIdx !== -1) {
        const start = Math.min(anchorIdx, clickIdx);
        const end = Math.max(anchorIdx, clickIdx);
        const range = new Set(visibleIds.slice(start, end + 1));
        setSelectedIds(range);
        return;
      }
    }

    // Toggle single item
    setSelectedIds(prev => {
      const next = isCtrl ? new Set(prev) : new Set();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setLastAnchor(id);
  };

  const selectAll = () => {
    setSelectedIds(new Set(scheduleList.filter(it => !it.saving).map(it => it.id)));
    setLastAnchor(null);
  };
  const deselectAll = () => {
    setSelectedIds(new Set());
    setLastAnchor(null);
  };

  const batchToggle = async (_completed: boolean) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      } catch { /* 继续下一个 */ }
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    setLastAnchor(null);
    refetch();
  };
  const [showFutureReminder, setShowFutureReminder] = useState(false);
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

  const { data: items, loading: listLoading, error, refetch } = useFetch<ScheduleItem[]>(
    () => apiFetch(SCHEDULE_API.byDate(date)),
    [apiFetch, date]
  );

  // 本地乐观更新镜像：勾选时立即更新 UI，后台 API 同步
  const [scheduleList, setScheduleList] = useState<ScheduleListItem[]>([]);
  useEffect(() => {
    if (items) setScheduleList(sortScheduleItems(items));
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
    if (validateAll()) return;

    // 检查是否为未来日期，且用户未勾选"不再提示"
    const isFutureDate = date > localToday();
    if (isFutureDate && !localStorage.getItem(REMINDER_KEY)) {
      setShowFutureReminder(true);
      setDontShowAgain(false);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    const submitted = {
      title: title.trim(),
      description,
      date,
      time,
      feeling: feeling as FeelingValue,
      showDesc,
    };
    const tempId = tempIdRef.current--;
    const temporaryItem: ScheduleListItem = {
      id: tempId,
      title: submitted.title,
      description: submitted.description,
      date: submitted.date,
      time: submitted.time,
      feeling: submitted.feeling,
      completed: false,
      userId: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saving: true,
      tempId,
    };

    setScheduleList(prev => sortScheduleItems([...prev, temporaryItem]));
    setTitle('');
    setDescription('');
    setFeeling(0);
    setHasInteracted(false);
    setShowDesc(false);
    setTime(submitted.date === todayValue() ? currentTimeValue() : submitted.time);
    revealRowIfNeeded(tempId);

    try {
      const saved = await apiFetch(SCHEDULE_API.base, {
        method: 'POST',
        body: JSON.stringify({
          title: submitted.title,
          description: submitted.description,
          date: submitted.date,
          time: submitted.time,
          feeling: submitted.feeling,
        }),
      }) as ScheduleItem;

      clear();
      setDraftDismissed(true);
      markScheduleCreated();

      setScheduleList(prev => sortScheduleItems(prev.map(item =>
        item.tempId === tempId ? { ...saved, justAdded: true } : item
      )));
      window.setTimeout(() => {
        setScheduleList(prev => prev.map(item =>
          item.id === saved.id ? { ...item, justAdded: false } : item
        ));
      }, 2500);
    } catch (err) {
      setScheduleList(prev => prev.filter(item => item.tempId !== tempId));
      setTitle(submitted.title);
      setDescription(submitted.description);
      setDate(submitted.date);
      setTime(submitted.time);
      setFeeling(submitted.feeling);
      setHasInteracted(true);
      setShowDesc(Boolean(submitted.description) || submitted.showDesc);
      focusTitleInput();
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

  const handleDelete = (id: number) => {
    setConfirmState({
      message: '确定要删除这条记录吗？',
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
          refetch();
        } catch (err) {
          addToast(err instanceof Error ? err.message : '删除失败', 'error');
        }
      },
    });
  };

  const handleUpdate = async (id: number, data: { title: string; description: string; date: string; time: string; feeling: FeelingValue }) => {
    // 乐观更新：立即可见，不触发列表重取
    setScheduleList(prev => sortScheduleItems(prev.map(it => it.id === id ? { ...it, ...data } : it)));
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      // 成功：乐观更新已准确，无需 refetch（避免无意义的重渲染）
    } catch (err) {
      refetch(); // 失败回滚：从服务器恢复正确数据
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const handleToggleComplete = async (id: number) => {
    // 乐观更新：立即翻转本地状态
    setScheduleList(prev => prev.map(it =>
      it.id === id ? { ...it, completed: !it.completed } : it
    ));
    try {
      await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      // 成功：乐观更新已准确，无需 refetch
    } catch (err) {
      // 失败时回滚
      setScheduleList(prev => prev.map(it =>
        it.id === id ? { ...it, completed: !it.completed } : it
      ));
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const displayKao = hasInteracted ? KAOMOJI[feeling] ?? DEFAULT_KAOMOJI : DEFAULT_KAOMOJI;

  return (
    <div className="schedule-page">
      <h2 className="schedule-page-title">添加新日程</h2>
      <div className="daily-quote">{quote}</div>

      <div className="card form-card">
        {/* Draft restore banner */}
        {hasDraft && !draftDismissed && draft && JSON.stringify(formDraft) !== JSON.stringify(draft) && (
          <div className="draft-restore-banner">
            <i className="fas fa-pencil-alt" />
            <span>你有未提交的日程草稿，是否恢复？</span>
            <button
              type="button"
              className="draft-restore-btn-restore"
              onClick={() => {
                setTitle(draft.title);
                setDescription(draft.description);
                setDate(draft.date);
                setTime(draft.time);
                setFeeling(draft.feeling);
                setHasInteracted(draft.feeling !== 0);
                setShowDesc(draft.showDesc);
                setDraftDismissed(true);
              }}
            >
              恢复
            </button>
            <button
              type="button"
              className="draft-restore-btn-discard"
              onClick={() => {
                clear();
                setDraftDismissed(true);
              }}
            >
              放弃
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className={`form-group ${errors.title ? 'has-error' : ''}`}>
            <label>事项 *</label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => touchField('title')}
              placeholder="记录今天发生的事情"
            />
            {errors.title && <div className="field-error">{errors.title}</div>}
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
        {error ? (
          <ErrorState
            title="加载失败"
            description={error}
            retry={{ label: '重试', onClick: refetch }}
            compact
          />
        ) : listLoading ? (
          <LoadingState label="加载日程..." compact />
        ) : scheduleList.length === 0 ? (
          <EmptyState
            title="今天还没有记录"
            description="添加第一条日程，开始记录你的心情吧。"
            icon="fa-regular fa-calendar-plus"
            compact
            {...(onboardingActive && !onboardingState.hasCreatedSchedule ? {
              onboardingHint: {
                stepLabel: '第 1 步',
                title: '记录你的第一条日程',
                description: '添加一个今天要做的事，给它一个心情值。这是自我理解循环的第一步。',
                action: {
                  label: '开始记录',
                  onClick: () => titleInputRef.current?.focus(),
                },
              },
            } : {})}
          />
        ) : (
          <div className="schedule-list">
            {scheduleList.map(item => (
              <div key={item.id} ref={el => { rowRefs.current[item.id] = el; }} className="schedule-item-row">
                {batchMode && !item.saving && (
                  <div
                    className={`batch-select-box ${selectedIds.has(item.id) ? 'selected' : ''}`}
                    onClick={(e) => handleSelectItem(item.id, e)}
                  >
                    {selectedIds.has(item.id) ? <i className="fas fa-check" /> : null}
                  </div>
                )}
                <ScheduleItemCard
                  item={item}
                  saving={item.saving}
                  justAdded={item.justAdded}
                  onDelete={batchMode || item.saving ? undefined : handleDelete}
                  onToggleComplete={batchMode || item.saving ? undefined : handleToggleComplete}
                  onUpdate={batchMode || item.saving ? undefined : handleUpdate}
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
            <button className="btn btn-danger" onClick={() => {
              setConfirmState({
                message: `确定删除选中的 ${selectedIds.size} 条日程吗？此操作不可撤销。`,
                danger: true,
                onConfirm: async () => {
                  setConfirmState(null);
                  const ids = Array.from(selectedIds);
                  for (const id of ids) {
                    try { await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' }); } catch { /* continue */ }
                  }
                   setSelectedIds(new Set());
                   setBatchMode(false);
                   setLastAnchor(null);
                   refetch();
                },
              });
            }}>批量删除</button>
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
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
