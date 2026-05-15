import { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import ChatView from '../AI/ChatView';
import { DIARY_API } from '../../services/api';
import type { DiaryEntry } from '../../types';
import './Thoughts.css';

type ThoughtTab = 'write' | 'ai' | 'review';

const today = () => new Date().toISOString().split('T')[0];

export default function ThoughtsPage() {
  const [activeTab, setActiveTab] = useState<ThoughtTab>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(today());
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [reviewDate, setReviewDate] = useState(today());

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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setDate(today());
    setEditingEntryId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = editingEntryId !== null;

    try {
      await apiFetch(isEditing ? `${DIARY_API.base}/${editingEntryId}` : DIARY_API.base, {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({ title, content, date }),
      });
      resetForm();
      refetch();
      addToast(isEditing ? '日记已更新' : '日记已保存', 'success');
      if (isEditing) setActiveTab('review');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setDate(entry.date);
    setActiveTab('write');
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${DIARY_API.base}/${id}`, { method: 'DELETE' });
      refetch();
      addToast('已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const tabs: { key: ThoughtTab; label: string; icon: string }[] = [
    { key: 'write', label: '记录思考', icon: 'fa-pen' },
    { key: 'ai', label: 'AI对话', icon: 'fa-robot' },
    { key: 'review', label: '回顾日记', icon: 'fa-history' },
  ];

  return (
    <div className="thoughts-page">
      <h2>我的思考</h2>

      <div className="thoughts-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`thoughts-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={`fas ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="thoughts-tab-content">
        {activeTab === 'write' && (
          <form onSubmit={handleSubmit} className="thoughts-form">
            {editingEntryId !== null && (
              <div className="edit-banner">
                <span>正在编辑回顾日记</span>
                <button type="button" onClick={resetForm}>取消编辑</button>
              </div>
            )}

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

            <button type="submit" className="submit-btn">
              {editingEntryId !== null ? '更新日记' : '保存日记'}
            </button>
          </form>
        )}

        {activeTab === 'ai' && <ChatView />}

        {activeTab === 'review' && (
          <div className="thoughts-review">
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

                    <div className="diary-actions">
                      <button className="edit-btn-small" onClick={() => handleEdit(entry)} title="编辑">
                        <i className="fas fa-pen" />
                      </button>
                      <button className="delete-btn-small" onClick={() => handleDelete(entry.id)} title="删除">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
