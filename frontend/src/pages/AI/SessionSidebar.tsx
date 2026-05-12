import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { AI_API } from '../../services/api';
import type { SessionListItem } from '../../types';
import styles from './AI.module.css';

interface SessionSidebarProps {
  activeSessionId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  chat: 'fa-comments',
  range: 'fa-calendar-alt',
  full: 'fa-chart-bar',
};

export default function SessionSidebar({ activeSessionId, onSelect, onNew }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // ── Fetch sessions ──
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(AI_API.sessions) as SessionListItem[];
      setSessions(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载会话列表失败';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, addToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Delete session ──
  const handleDelete = useCallback(async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger select
    if (deleting !== null) return;

    setDeleting(sessionId);
    try {
      await apiFetch(`${AI_API.sessions}/${sessionId}`, { method: 'DELETE' });
      addToast('会话已删除', 'success');
      // If deleting active session, notify parent (set to null)
      if (activeSessionId === sessionId) {
        onSelect(0); // dummy, parent should handle
      }
      await fetchSessions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      addToast(msg, 'error');
    } finally {
      setDeleting(null);
    }
  }, [apiFetch, addToast, deleting, activeSessionId, onSelect, fetchSessions]);

  // ── Start rename ──
  const handleStartRename = useCallback((sessionId: number, currentTitle: string) => {
    setEditingId(sessionId);
    setEditTitle(currentTitle);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // ── Rename (save) ──
  const handleRename = useCallback(async (sessionId: number) => {
    const trimmed = editTitle.trim();
    if (!trimmed || sessionId !== editingId) {
      setEditingId(null);
      setEditTitle('');
      return;
    }
    try {
      await apiFetch(AI_API.rename(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      addToast('重命名成功', 'success');
      setEditingId(null);
      setEditTitle('');
      await fetchSessions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '重命名失败';
      addToast(msg, 'error');
      setEditingId(null);
      setEditTitle('');
    }
  }, [apiFetch, addToast, editingId, editTitle, fetchSessions]);

  // ── Cancel rename ──
  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
  }, []);

  // ── Format date ──
  const formatDate = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <div className={styles.sessionSidebar}>
      {/* New session button */}
      <button className={styles.newSessionBtn} onClick={onNew}>
        <i className="fas fa-plus" />
        新建会话
      </button>

      {/* Loading */}
      {loading && (
        <div className={styles.sidebarLoading}>
          <div className={styles.spinner} />
          <span>加载中...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className={styles.sidebarEmpty}>
          <i className="fas fa-inbox" />
          <p>暂无会话</p>
          <span>点击上方按钮创建</span>
        </div>
      )}

      {/* Session list */}
      {!loading && sessions.length > 0 && (
        <div className={styles.sessionList}>
          {sessions.map(session => (
            <div
              key={session.id}
              className={`${styles.sessionItem} ${
                activeSessionId === session.id ? styles.sessionItemActive : ''
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className={styles.sessionItemIcon}>
                <i className={`fas ${TYPE_ICONS[session.sessionType] || 'fa-comments'}`} />
              </div>
                <div className={styles.sessionItemBody}>
                  <div className={styles.sessionItemTitleRow}>
                    {editingId === session.id ? (
                      <input
                        ref={inputRef}
                        className={styles.renameInput}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(session.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        onBlur={() => handleRename(session.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div
                          className={styles.sessionItemTitle}
                          onDoubleClick={() => handleStartRename(session.id, session.title)}
                        >
                          {session.title}
                        </div>
                        <button
                          className={styles.editBtn}
                          onClick={e => {
                            e.stopPropagation();
                            handleStartRename(session.id, session.title);
                          }}
                          title="重命名"
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={e => handleDelete(session.id, e)}
                          disabled={deleting === session.id}
                          title="删除会话"
                        >
                          <i className={`fas ${deleting === session.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                        </button>
                      </>
                    )}
                  </div>
                <div className={styles.sessionItemMeta}>
                  {formatDate(session.createdAt)}
                  {session.messageCount > 0 && (
                    <span className={styles.sessionBadge}>{session.messageCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
