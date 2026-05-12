import { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import AIChatPanel from '../AI/AIChatPanel';
import SessionSidebar from '../AI/SessionSidebar';
import { DIARY_API, AI_API } from '../../services/api';
import type { DiaryEntry } from '../../types';
import './Thoughts.css';

type ThoughtTab = 'write' | 'ai' | 'review';

export default function ThoughtsPage() {
  const [activeTab, setActiveTab] = useState<ThoughtTab>('write');
  // Write tab
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // Review tab
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  // AI tab
  const [aiSessionId, setAiSessionId] = useState<number | null>(null);
  const [aiRateLimited, setAiRateLimited] = useState(false);
  const [aiQuota, setAiQuota] = useState(50);
  const [sessionRefresh, setSessionRefresh] = useState(0);

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

  // AI tab: create session on first open
  useEffect(() => {
    if (activeTab === 'ai' && aiSessionId === null && !aiRateLimited) {
      let cancelled = false;
      (async () => {
        try {
          const session = await apiFetch(AI_API.sessions, {
            method: 'POST',
            body: JSON.stringify({ title: '新对话', sessionType: 'chat' }),
          });
          if (!cancelled) { setAiSessionId(session.id); setSessionRefresh(r => r + 1); }
        } catch {
          // fail silently — user can retry
        }
      })();
      return () => { cancelled = true; };
    }
  }, [activeTab, aiSessionId, aiRateLimited, apiFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(DIARY_API.base, {
        method: 'POST',
        body: JSON.stringify({ title, content, date }),
      });
      setTitle('');
      setContent('');
      if (date === reviewDate) refetch();
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

  const handleNewAiSession = useCallback(async () => {
    setAiSessionId(null);
    try {
      const session = await apiFetch(AI_API.sessions, {
        method: 'POST',
        body: JSON.stringify({ sessionType: 'chat' }),
      });
      setAiSessionId(session.id);
      setSessionRefresh(r => r + 1);
    } catch {
      addToast('创建会话失败', 'error');
    }
  }, [apiFetch, addToast]);

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
        )}

        {activeTab === 'ai' && (
          <div className="thoughts-ai-panel">
            {aiSessionId !== null ? (
              <div className="ai-layout">
                <SessionSidebar
                  activeSessionId={aiSessionId}
                  onSelect={(id) => setAiSessionId(id)}
                  onNew={handleNewAiSession}
                  refreshTrigger={sessionRefresh}
                />
                <div className="ai-chat-area">
                  <AIChatPanel
                    sessionId={aiSessionId}
                    rateLimited={aiRateLimited}
                    onRateLimited={setAiRateLimited}
                    onQuotaUpdate={(headers: Headers) => {
                      const remaining = headers.get('X-RateLimit-Remaining');
                      if (remaining) setAiQuota(Number(remaining));
                    }}
                    onComplete={() => {}}
                  />
                </div>
              </div>
            ) : (
              <div className="ai-loading-state">
                {aiRateLimited ? (
                  <p className="empty-text">今日调用次数已用完，请明天再试</p>
                ) : (
                  <>
                    <p className="empty-text">正在创建会话...</p>
                    <button className="submit-btn" onClick={handleNewAiSession}>重试</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
                    <button className="delete-btn-small" onClick={() => handleDelete(entry.id)} title="删除">
                      <i className="fas fa-trash" />
                    </button>
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
