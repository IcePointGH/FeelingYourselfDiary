import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useEmotionLabels } from '../../contexts/EmotionLabelsContext';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import { SCHEDULE_API } from '../../services/api';
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
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const { apiFetch } = useApi();
  const { emotionLabels } = useEmotionLabels();
  const { addToast } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await apiFetch(SCHEDULE_API.byDate(date));
      setItems(data || []);
    } catch {
      // ignore
    }
  }, [apiFetch, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems();
  }, [loadItems]);

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
      loadItems();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '添加日程失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
      loadItems();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const getFeelingClass = (val: number) => {
    if (val < 0) return 'negative';
    if (val > 0) return 'positive';
    return 'neutral';
  };

  return (
    <div className="schedule-page">
      <div className="daily-quote">{quote}</div>

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
          <div className="form-group">
            <label>感受值</label>
            <div className="feeling-selector">
              {[-3, -2, -1, 0, 1, 2, 3].map(val => (
                <button
                  key={val}
                  type="button"
                  className={`feeling-btn ${getFeelingClass(val)} ${feeling === val ? 'selected' : ''}`}
                  onClick={() => setFeeling(val)}
                  title={emotionLabels[String(val)] ?? String(val)}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
            <div className="feeling-label">
              {emotionLabels[String(feeling)] ?? String(feeling)}
            </div>
          </div>
          <button type="submit" className="btn submit-btn">添加日程</button>
        </form>
      </div>

      <div className="card list-card">
        <h2>当日记录</h2>
        {items.length === 0 ? (
          <p className="empty-text">今天还没有记录，添加第一条吧～</p>
        ) : (
          <div className="schedule-list">
            {items.map(item => (
              <div key={item.id} className="schedule-item">
                <div className="schedule-info">
                  <div className="schedule-title">{item.title}</div>
                  {item.description && (
                    <div className="schedule-desc">{item.description}</div>
                  )}
                  <div className="schedule-meta">
                    <span>{item.date} {item.time}</span>
                    <span className={`feeling-badge ${getFeelingClass(item.feeling)}`}>
                      {item.feeling > 0 ? `+${item.feeling}` : item.feeling}
                    </span>
                  </div>
                </div>
                <button
                  className="delete-btn-small"
                  onClick={() => handleDelete(item.id)}
                  title="删除"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
