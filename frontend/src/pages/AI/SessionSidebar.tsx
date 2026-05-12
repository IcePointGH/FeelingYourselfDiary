import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { AI_API } from '../../services/api';
import type { SessionListItem } from '../../types';
import EmptyState from '../../components/EmptyState/EmptyState';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './AI.module.css';

interface SessionSidebarProps {
  activeSessionId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  refreshTrigger?: number;
}

const TYPE_ICONS: Record<string, string> = {
  chat: 'fa-comments',
  range: 'fa-calendar-alt',
  full: 'fa-chart-bar',
};

export default function SessionSidebar({ activeSessionId, onSelect, onNew, refreshTrigger }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // ── Fetch sessions ──
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(AI_API.sessions) as SessionListItem[];
      // Only show chat sessions in sidebar — range/full are managed in their own tabs
      setSessions(data.filter(s => s.sessionType === 'chat'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载会话列表失败';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, addToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshTrigger]);

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

  // ── Wrapped select: close sidebar overlay on mobile ──
  const handleSelect = useCallback((id: number) => {
    onSelect(id);
    setSidebarOpen(false);
  }, [onSelect]);

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <>
      {/* Hamburger button (visible on mobile) */}
      <button
        className={styles.hamburgerBtn}
        onClick={() => setSidebarOpen(true)}
        aria-label="打开会话列表"
      >
        <i className="fas fa-bars" />
      </button>

      {/* Overlay backdrop */}
      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${styles.sessionSidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Close button (visible inside overlay on mobile) */}
        <button
          className={styles.sidebarCloseBtn}
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭会话列表"
        >
          <i className="fas fa-times" />
        </button>

        {/* New session button */}
        <button className={styles.newSessionBtn} onClick={onNew}>
          <i className="fas fa-plus" />
          新建会话
        </button>

        {/* Loading skeletons */}
        {loading && (
          <div className={styles.sidebarLoading}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skeletonSessionCard}>
                <Skeleton variant="circle" width="28px" height="28px" />
                <div className={styles.skeletonSessionBody}>
                  <Skeleton width="80%" height="14px" />
                  <Skeleton width="55%" height="11px" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div className={styles.sidebarEmpty}>
            <EmptyState
              icon="fa-robot"
              title="暂无会话"
              description="进入对话分析即可自动创建"
            />
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
                onClick={() => handleSelect(session.id)}
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
    </>
  );
}
