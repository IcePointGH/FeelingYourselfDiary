import { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import CollapsiblePanel from '../../components/CollapsiblePanel/CollapsiblePanel';
import { DIARY_API } from '../../services/api';
import type { DiaryEntry } from '../../types';
import './Thoughts.css';

export default function ThoughtsPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);

  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const { data: entries, error, refetch } = useFetch<DiaryEntry[]>(
    () => apiFetch(DIARY_API.byDate(reviewDate)),
    [apiFetch, reviewDate]
  );

  const entryList = entries ?? [];

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(DIARY_API.base, {
        method: 'POST',
        body: JSON.stringify({ title, content, date }),
      });
      setTitle('');
      setContent('');
      if (date === reviewDate) {
        refetch();
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条日记吗？')) return;
    try {
      await apiFetch(`${DIARY_API.base}/${id}`, { method: 'DELETE' });
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div className="thoughts-page">
      <h2>我的思考</h2>
      <p className="thoughts-desc">记录你的思考和感受</p>

      <CollapsiblePanel title="写思考">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给你的情绪起个名字"
              required
            />
          </div>
          <div className="form-group">
            <label>日期</label>
            <DateInput value={date} onChange={v => setDate(v)} required />
          </div>
          <div className="form-group">
            <label>内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="在这里记录你的感受..."
              rows={10}
              required
            />
          </div>
          <button type="submit" className="submit-btn">保存日记</button>
        </form>
      </CollapsiblePanel>

      <div style={{ marginTop: '20px' }}>
        <CollapsiblePanel title="回顾日记">
          <div className="form-group review-date-row">
            <label>选择日期</label>
            <DateInput value={reviewDate} onChange={v => setReviewDate(v)} />
          </div>
          {entryList.length === 0 ? (
            <p className="empty-text">请选择日期查找日记</p>
          ) : (
            <div className="diary-list">
              {entryList.map(entry => (
                <div key={entry.id} className="diary-item">
                  <div className="diary-info">
                    <div className="diary-title">{entry.title}</div>
                    <div className="diary-content">{entry.content}</div>
                    <div className="diary-meta">{entry.date}</div>
                  </div>
                  <button className="delete-btn-small" onClick={() => handleDelete(entry.id)} title="删除">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CollapsiblePanel>
      </div>
    </div>
  );
}
