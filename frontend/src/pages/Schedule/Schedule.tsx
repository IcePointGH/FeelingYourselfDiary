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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { apiFetch } = useApi();
  const { addToast } = useToast();

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

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const scheduleList = items ?? [];
  const displayKao = hasInteracted ? KAOMOJI[feeling] ?? DEFAULT_KAOMOJI : DEFAULT_KAOMOJI;
  const kaoMood = hasInteracted ? getFeelingClass(feeling) : 'positive';

  return (
    <div className="schedule-page">
      <div className="daily-quote">{quote}</div>

      <div className={`kaomoji-showcase ${kaoMood}`}>
        <span className="kaomoji-face" key={kaoAnimKey}>{displayKao}</span>
        <span className="kaomoji-hint">
          {hasInteracted ? '此刻的感受' : '你的心情是...'}
        </span>
      </div>

      <div className="card form-card">
        <h2>添加新日程</h2>
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
          <div className="form-group">
            <label>感受描述</label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="在这里记录你的感受..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>日期和时间</label>
            <div className="datetime-row">
              <DateInput value={date} onChange={v => setDate(v)} required />
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <FeelingSelector value={feeling} onChange={handleFeelingChange} mode={mode} />
          <button type="submit" className="btn submit-btn">添加日程</button>
        </form>
      </div>

      <div className="card list-card">
        <h2>当日记录</h2>
        {scheduleList.length === 0 ? (
          <p className="empty-text">今天还没有记录，添加第一条吧～</p>
        ) : (
          <div className="schedule-list">
            {scheduleList.map(item => (
              <ScheduleItemCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
