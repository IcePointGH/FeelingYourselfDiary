import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { AI_API } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getMoodColor, getMoodBgColor } from '../../utils/feeling';
import type { ContextEntry, ScheduleSummary, DiarySummary } from '../../types';
import styles from './AI.module.css';

const FEELING_LABELS: Record<number, string> = {
  [-3]: '极差',
  [-2]: '较差',
  [-1]: '略差',
  [0]: '一般',
  [1]: '略好',
  [2]: '较好',
  [3]: '极好',
};

interface ContextPickerProps {
  sessionId: number;
  contextEntries: ContextEntry[];
  onContextChange: () => void;
  onRemoveContext: (entryId: number) => void;
}

export default function ContextPicker({
  sessionId,
  contextEntries,
  onContextChange,
  onRemoveContext,
}: ContextPickerProps) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [diaries, setDiaries] = useState<DiarySummary[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingDiaries, setLoadingDiaries] = useState(true);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  // Load schedules and diaries on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingSchedules(true);
      try {
        const data = await apiFetch(AI_API.contextSchedules);
        if (!cancelled) setSchedules(data ?? []);
      } catch (err) {
        if (!cancelled) addToast('加载日程列表失败', 'error');
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    })();

    (async () => {
      setLoadingDiaries(true);
      try {
        const data = await apiFetch(AI_API.contextDiaries);
        if (!cancelled) setDiaries(data ?? []);
      } catch (err) {
        if (!cancelled) addToast('加载日记列表失败', 'error');
      } finally {
        if (!cancelled) setLoadingDiaries(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apiFetch, addToast]);

  // Check if a schedule/diary is selected
  const isScheduleSelected = (scheduleId: number) =>
    contextEntries.some(e => e.scheduleId === scheduleId);
  const isDiarySelected = (diaryId: number) =>
    contextEntries.some(e => e.diaryId === diaryId);

  // Toggle schedule selection
  const toggleSchedule = async (scheduleId: number) => {
    const key = `s:${scheduleId}`;
    if (addingIds.has(key)) return;

    if (isScheduleSelected(scheduleId)) {
      // Find context entry to remove
      const entry = contextEntries.find(e => e.scheduleId === scheduleId);
      if (entry) {
        setAddingIds(prev => new Set(prev).add(key));
        try {
          await apiFetch(`${AI_API.sessionContext(sessionId)}/${entry.id}`, { method: 'DELETE' });
          onContextChange();
        } catch {
          addToast('移除日程失败', 'error');
        } finally {
          setAddingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
      }
    } else {
      setAddingIds(prev => new Set(prev).add(key));
      try {
        await apiFetch(AI_API.sessionContext(sessionId), {
          method: 'POST',
          body: JSON.stringify({ scheduleId, diaryId: null }),
        });
        onContextChange();
      } catch {
        addToast('添加日程失败', 'error');
      } finally {
        setAddingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
      }
    }
  };

  // Toggle diary selection
  const toggleDiary = async (diaryId: number) => {
    const key = `d:${diaryId}`;
    if (addingIds.has(key)) return;

    if (isDiarySelected(diaryId)) {
      const entry = contextEntries.find(e => e.diaryId === diaryId);
      if (entry) {
        setAddingIds(prev => new Set(prev).add(key));
        try {
          await apiFetch(`${AI_API.sessionContext(sessionId)}/${entry.id}`, { method: 'DELETE' });
          onContextChange();
        } catch {
          addToast('移除日记失败', 'error');
        } finally {
          setAddingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
      }
    } else {
      setAddingIds(prev => new Set(prev).add(key));
      try {
        await apiFetch(AI_API.sessionContext(sessionId), {
          method: 'POST',
          body: JSON.stringify({ diaryId, scheduleId: null }),
        });
        onContextChange();
      } catch {
        addToast('添加日记失败', 'error');
      } finally {
        setAddingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
      }
    }
  };

  return (
    <div className={styles.contextPicker}>
      {/* Selected entries */}
      <div className={styles.contextSection}>
        <h4 className={styles.contextSectionTitle}>已选中的上下文</h4>
        {contextEntries.length === 0 ? (
          <p className={styles.contextEmpty}>暂无选中的数据</p>
        ) : (
          <div className={styles.contextSelectedList}>
            {contextEntries.map(entry => (
              <div key={entry.id} className={styles.contextSelectedItem}>
                <div className={styles.contextSelectedInfo}>
                  <span className={styles.contextSelectedDate}>{entry.date}</span>
                  <span className={styles.contextSelectedTitle}>
                    {entry.title}
                    {entry.type === 'schedule' && entry.feeling != null && (
                      <span
                        className={styles.contextSelectedFeeling}
                        style={{ color: getMoodColor(entry.feeling) }}
                      >
                        ({FEELING_LABELS[entry.feeling] ?? entry.feeling})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  className={styles.contextRemoveBtn}
                  onClick={() => onRemoveContext(entry.id)}
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedules section */}
      <div className={styles.contextSection}>
        <h4 className={styles.contextSectionTitle}>日程记录</h4>
        {loadingSchedules ? (
          <div className={styles.contextLoading}>加载中...</div>
        ) : schedules.length === 0 ? (
          <p className={styles.contextEmpty}>暂无日程记录</p>
        ) : (
          <div className={styles.contextList}>
            {schedules.map(s => (
              <label key={s.id} className={styles.contextItem}>
                <input
                  type="checkbox"
                  checked={isScheduleSelected(s.id)}
                  onChange={() => toggleSchedule(s.id)}
                  disabled={addingIds.has(`s:${s.id}`)}
                />
                <div className={styles.contextItemBody}>
                  <div className={styles.contextItemTitle}>{s.title}</div>
                  <div className={styles.contextItemMeta}>
                    <span>{s.date}</span>
                    {s.time && <span>{s.time}</span>}
                    <span
                      className={styles.contextFeelingBadge}
                      style={{
                        color: getMoodColor(s.feeling),
                        background: getMoodBgColor(s.feeling),
                      }}
                    >
                      {FEELING_LABELS[s.feeling] ?? s.feeling}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Diaries section */}
      <div className={styles.contextSection}>
        <h4 className={styles.contextSectionTitle}>日记记录</h4>
        {loadingDiaries ? (
          <div className={styles.contextLoading}>加载中...</div>
        ) : diaries.length === 0 ? (
          <p className={styles.contextEmpty}>暂无日记记录</p>
        ) : (
          <div className={styles.contextList}>
            {diaries.map(d => (
              <label key={d.id} className={styles.contextItem}>
                <input
                  type="checkbox"
                  checked={isDiarySelected(d.id)}
                  onChange={() => toggleDiary(d.id)}
                  disabled={addingIds.has(`d:${d.id}`)}
                />
                <div className={styles.contextItemBody}>
                  <div className={styles.contextItemTitle}>{d.title}</div>
                  <div className={styles.contextItemMeta}>
                    <span>{d.date}</span>
                    <span className={styles.contextDiaryPreview}>{d.content}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
