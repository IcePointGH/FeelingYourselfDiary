import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useApi } from '../../hooks/useApi';
import { AI_API } from '../../services/api';
import { getMoodColor, getMoodBgColor } from '../../utils/feeling';
import type {
  SessionListItem,
  SessionResponse,
  MessageResponse,
  ContextEntry,
  ScheduleSummary,
  DiarySummary,
} from '../../types';
import styles from './ChatView.module.css';

const API_BASE = '/api';

function formatFeeling(v: number): string {
  if (v > 0) return `+${v}`;
  return String(v);
}

// ─── Helpers ────────────────────────────────────────────

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatDate(ts: string) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ─── Component ──────────────────────────────────────────

export default function ChatView() {
  // ── Session state ──
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // ── Diary save state ──
  const [sessionDiaryId, setSessionDiaryId] = useState<number | null>(null);
  const [savingDiary, setSavingDiary] = useState(false);

  // ── Message / chat state ──
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [waitingFirst, setWaitingFirst] = useState(false);

  // ── Context picker state ──
  const [ctxEntries, setCtxEntries] = useState<ContextEntry[]>([]);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [diaries, setDiaries] = useState<DiarySummary[]>([]);
  const [ctxSchedLoading, setCtxSchedLoading] = useState(false);
  const [ctxDiaryLoading, setCtxDiaryLoading] = useState(false);

  // ── Sidebar mobile overlay ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Rename state ──
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // ── Refs ──
  const { token } = useAuth();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const msgEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const prevMsgLenRef = useRef(0);
  const initialScrollRef = useRef(true);

  // ════════════════════════════════════════════
  //  SESSION LIST
  // ════════════════════════════════════════════

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiFetch(AI_API.sessions) as SessionListItem[];
      setSessions(data.filter(s => s.sessionType === 'chat'));
    } catch {
      addToast('加载会话列表失败', 'error');
    } finally {
      setSessionsLoading(false);
    }
  }, [apiFetch, addToast]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Create session ──
  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const data = await apiFetch(AI_API.sessions, {
        method: 'POST',
        body: JSON.stringify({ title: '新对话', sessionType: 'chat' }),
      }) as { id: number };
      setActiveId(data.id);
      await fetchSessions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '创建失败', 'error');
    } finally {
      setCreating(false);
    }
  }, [apiFetch, addToast, creating, fetchSessions]);

  // ── Delete session ──
  const handleDeleteSession = useCallback(async (id: number) => {
    try {
      await apiFetch(`${AI_API.sessions}/${id}`, { method: 'DELETE' });
      addToast('已删除', 'success');
      if (activeId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      await fetchSessions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  }, [apiFetch, addToast, activeId, sessions, fetchSessions]);

  // ── Rename session ──
  const handleStartRename = useCallback((id: number, title: string) => {
    setRenameId(id);
    setRenameTitle(title);
    setTimeout(() => renameRef.current?.focus(), 0);
  }, []);

  const handleRename = useCallback(async () => {
    if (!renameId || !renameTitle.trim()) { setRenameId(null); return; }
    try {
      await apiFetch(AI_API.rename(renameId), {
        method: 'PUT',
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      addToast('重命名成功', 'success');
      setRenameId(null);
      await fetchSessions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '重命名失败', 'error');
      setRenameId(null);
    }
  }, [apiFetch, addToast, renameId, renameTitle, fetchSessions]);

  // ════════════════════════════════════════════
  //  MESSAGES — load on activeId change
  // ════════════════════════════════════════════

  useEffect(() => {
    if (activeId === null) { setMessages([]); return; }
    let cancelled = false;
    initialScrollRef.current = true;
    setMessagesLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/sessions/${activeId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`加载失败 (${res.status})`);
        const json = await res.json();
        const data: SessionResponse = json.data ?? json;
        if (!cancelled) {
          setMessages(data.messages ?? []);
          setSessionDiaryId(data.diaryId ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          addToast(err instanceof Error ? err.message : '加载消息失败', 'error');
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeId, token, addToast]);

  // ── Scroll: only on new messages ──
  useEffect(() => {
    if (messages.length === 0) return;
    if (initialScrollRef.current) {
      initialScrollRef.current = false;
      // Scroll to bottom once on initial load
      msgEndRef.current?.scrollIntoView({ behavior: 'instant' });
    } else if (messages.length > prevMsgLenRef.current || streamContent) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgLenRef.current = messages.length;
  }, [messages, streamContent]);

  // ════════════════════════════════════════════
  //  SEND MESSAGE (SSE streaming)
  // ════════════════════════════════════════════

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || activeId === null) return;

    const optimistic: MessageResponse = {
      id: -Date.now(), role: 'user', content: trimmed,
      sequenceNum: messages.length + 1, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setStreaming(true);
    setStreamContent('');
    setWaitingFirst(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fullContentRef.current = '';

    try {
      const res = await fetch(`${API_BASE}/ai/sessions/${activeId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let msg = `请求失败 (${res.status})`;
        try { const e = await res.json(); msg = e.message || msg; } catch { /* ignore JSON parse errors */ }
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      const scheduleRender = () => {
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            setStreamContent(fullContentRef.current);
            rafRef.current = null;
          });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          for (let line of part.split('\n')) {
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5);
            const d = raw.startsWith(' ') ? raw.slice(1) : raw;
            if (!d || d === '[DONE]') continue;
            try { fullContentRef.current += JSON.parse(d).content ?? d; }
            catch { fullContentRef.current += d; }
            setWaitingFirst(false);
          }
        }
        scheduleRender();
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let line of buffer.split('\n')) {
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5);
          const d = raw.startsWith(' ') ? raw.slice(1) : raw;
          if (!d || d === '[DONE]') continue;
          try { fullContentRef.current += JSON.parse(d).content ?? d; }
          catch { fullContentRef.current += d; }
        }
        scheduleRender();
      }

      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

      const final = fullContentRef.current.trim();
      if (final) {
        const assistant: MessageResponse = {
          id: Date.now(), role: 'assistant', content: final,
          sequenceNum: messages.length + 2, createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistant]);
      }
      // Refresh sessions to update title/messageCount
      setTimeout(() => fetchSessions(), 1500);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setStreaming(false);
      setStreamContent('');
      setWaitingFirst(false);
      abortRef.current = null;
    }
  }, [input, streaming, activeId, messages.length, token, addToast, fetchSessions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // ── Copy / Delete message ──
  const handleCopy = useCallback(async (content: string) => {
    try { await navigator.clipboard.writeText(content); addToast('已复制', 'success'); }
    catch { addToast('复制失败', 'error'); }
  }, [addToast]);

  const handleDeleteMsg = useCallback(async (id: number) => {
    try {
      await apiFetch(AI_API.deleteMessage(id), { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== id));
      addToast('已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  }, [apiFetch, addToast]);

  // ── Summarize to diary ──
  const handleSaveToDiary = useCallback(async () => {
    if (savingDiary || activeId === null || messages.length === 0) return;
    setSavingDiary(true);
    try {
      const data = await apiFetch(AI_API.summarizeToDiary(activeId), { method: 'POST' }) as { diaryId: number; diaryDate: string; updated: boolean };
      setSessionDiaryId(data.diaryId);
      addToast(data.updated ? '日记已更新' : '已保存到回顾日记', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSavingDiary(false);
    }
  }, [apiFetch, addToast, savingDiary, activeId, messages.length]);

  // ════════════════════════════════════════════
  //  CONTEXT PICKER
  // ════════════════════════════════════════════

  const fetchContext = useCallback(async () => {
    if (activeId === null) return;
    try {
      const data = await apiFetch(AI_API.sessionContext(activeId));
      setCtxEntries(data ?? []);
    } catch { /* context fetch is optional — fail silently */ }
  }, [apiFetch, activeId]);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  const loadContextData = useCallback(() => {
    setCtxOpen(true);
    setCtxSchedLoading(true);
    setCtxDiaryLoading(true);
    apiFetch(AI_API.contextSchedules).then(d => setSchedules(d ?? [])).catch(() => {}).finally(() => setCtxSchedLoading(false));
    apiFetch(AI_API.contextDiaries).then(d => setDiaries(d ?? [])).catch(() => {}).finally(() => setCtxDiaryLoading(false));
  }, [apiFetch]);

  const isSchedSelected = useCallback((id: number) => ctxEntries.some(e => e.scheduleId === id), [ctxEntries]);
  const isDiarySelected = useCallback((id: number) => ctxEntries.some(e => e.diaryId === id), [ctxEntries]);

  const toggleContext = useCallback(async (type: 'schedule' | 'diary', id: number) => {
    if (activeId === null) return;
    const selected = type === 'schedule' ? isSchedSelected(id) : isDiarySelected(id);
    const entry = selected ? ctxEntries.find(e =>
      type === 'schedule' ? e.scheduleId === id : e.diaryId === id) : null;

    try {
      if (entry) {
        await apiFetch(`${AI_API.sessionContext(activeId)}/${entry.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(AI_API.sessionContext(activeId), {
          method: 'POST',
          body: JSON.stringify(type === 'schedule' ? { scheduleId: id, diaryId: null } : { diaryId: id, scheduleId: null }),
        });
      }
      await fetchContext();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  }, [activeId, ctxEntries, apiFetch, fetchContext, addToast, isSchedSelected, isDiarySelected]);

  const removeContext = useCallback(async (entryId: number) => {
    if (activeId === null) return;
    try {
      await apiFetch(`${AI_API.sessionContext(activeId)}/${entryId}`, { method: 'DELETE' });
      await fetchContext();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '移除失败', 'error');
    }
  }, [activeId, apiFetch, fetchContext, addToast]);

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════

  return (
    <div className={styles.wrapper}>
      {/* Mobile hamburger */}
      <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="会话列表">
        <i className="fas fa-bars" />
        {activeId !== null && <span className={styles.hamburgerBadge}>{sessions.length}</span>}
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── Session sidebar ── */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
          <i className="fas fa-times" />
        </button>

        <button className={styles.newBtn} onClick={handleCreate} disabled={creating}>
          {creating ? <><span className={styles.spin} /> 创建中...</> : <><i className="fas fa-plus" /> 新建会话</>}
        </button>

        {sessionsLoading ? (
          <div className={styles.sidebarLoading}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skelItem}>
                <div className={styles.skelCircle} />
                <div className={styles.skelLines}>
                  <div className={styles.skelLine1} />
                  <div className={styles.skelLine2} />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.sidebarEmpty}>
            <i className="fas fa-robot" />
            <p>暂无会话</p>
            <span>点击上方按钮创建</span>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map(s => (
              <div
                key={s.id}
                className={`${styles.sessionItem} ${activeId === s.id ? styles.sessionItemActive : ''}`}
                onClick={() => { setActiveId(s.id); setSidebarOpen(false); }}
              >
                <div className={styles.sessionIcon}><i className="fas fa-comments" /></div>
                <div className={styles.sessionBody}>
                  {renameId === s.id ? (
                    <input
                      ref={renameRef}
                      className={styles.renameInput}
                      value={renameTitle}
                      onChange={e => setRenameTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameId(null); }}
                      onBlur={handleRename}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className={styles.sessionTitle} onDoubleClick={() => handleStartRename(s.id, s.title)}>
                        {s.title}
                      </div>
                      <div className={styles.sessionActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={e => { e.stopPropagation(); handleStartRename(s.id, s.title); }}
                          title="重命名"
                        ><i className="fas fa-pen" /></button>
                        <button
                          className={styles.iconBtn}
                          onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                          title="删除"
                        ><i className="fas fa-trash" /></button>
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.sessionMeta}>
                  {formatDate(s.createdAt)}
                  {s.messageCount > 0 && <span className={styles.badge}>{s.messageCount}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat panel ── */}
      <div className={styles.panel}>
        {activeId === null ? (
          <div className={styles.emptyState}>
            <i className="fas fa-comments" />
            <h3>开始对话</h3>
            <p>选择或创建一个会话开始与 AI 对话</p>
            <button className={styles.newBtn} onClick={handleCreate} disabled={creating}>
              {creating ? <><span className={styles.spin} /> 创建中...</> : <><i className="fas fa-plus" /> 新建会话</>}
            </button>
          </div>
        ) : messagesLoading ? (
          <div className={styles.loadingState}>
            <span className={styles.spin} />
            <p>加载消息中...</p>
          </div>
        ) : (
          <>
            {/* Message list */}
            <div className={styles.msgList}>
              {messages.length === 0 && !streaming && (
                <div className={styles.emptyChat}>
                  <i className="fas fa-comments" />
                  <h3>开始对话</h3>
                  <p>发送第一条消息，与小七聊聊</p>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : styles.msgRowAi}`}>
                  <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
                    {msg.role !== 'user' && (
                      <div className={styles.avatar}><i className="fas fa-robot" /></div>
                    )}
                    <div className={styles.msgContent}>
                      {msg.role === 'user' ? (
                        <p className={styles.msgText}>{msg.content}</p>
                      ) : (
                        <div className={styles.markdown}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <div className={styles.msgFooter}>
                      {msg.role === 'user' ? (
                        <>
                          <div className={styles.msgActs}>
                            <button className={styles.actBtn} onClick={() => handleCopy(msg.content)}><i className="fas fa-copy" /></button>
                            <button className={styles.actBtn} onClick={() => handleDeleteMsg(msg.id)}><i className="fas fa-trash" /></button>
                          </div>
                          <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                          <div className={styles.msgActs}>
                            <button className={styles.actBtn} onClick={() => handleCopy(msg.content)}><i className="fas fa-copy" /></button>
                            <button className={styles.actBtn} onClick={() => handleDeleteMsg(msg.id)}><i className="fas fa-trash" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {streaming && streamContent && (
                <div className={`${styles.msgRow} ${styles.msgRowAi}`}>
                  <div className={`${styles.bubble} ${styles.bubbleAi} ${styles.bubbleStream}`}>
                    <div className={styles.avatar}><i className="fas fa-robot" /></div>
                    <div className={styles.streamText}>{streamContent}<span className={styles.cursor} /></div>
                  </div>
                </div>
              )}

              {/* Typing dots */}
              {streaming && waitingFirst && (
                <div className={`${styles.msgRow} ${styles.msgRowAi}`}>
                  <div className={`${styles.bubble} ${styles.bubbleAi}`}>
                    <div className={styles.typing}><span /><span /><span /></div>
                  </div>
                </div>
              )}

              <div ref={msgEndRef} />
            </div>

            {/* Context chips */}
            {ctxEntries.length > 0 && (
              <div className={styles.ctxChips}>
                <i className="fas fa-database" />
                {ctxEntries.map(e => (
                  <span key={e.id} className={styles.ctxChip}>
                    [{e.date}] {e.title}
                    {e.feeling != null && <span className={styles.ctxFeeling}>({e.feeling > 0 ? '+' : ''}{e.feeling})</span>}
                    <button onClick={() => removeContext(e.id)}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Save to diary button */}
            {messages.length > 0 && (
              <div className={styles.diaryBar}>
                <button
                  className={styles.diaryBtn}
                  onClick={handleSaveToDiary}
                  disabled={savingDiary}
                  title={sessionDiaryId ? '更新回顾日记' : '保存到回顾日记'}
                >
                  {savingDiary ? (
                    <><span className={styles.spin} /> AI 总结中...</>
                  ) : (
                    <><i className="fas fa-book" /> {sessionDiaryId ? '更新日记' : '保存到日记'}</>
                  )}
                </button>
                {sessionDiaryId && (
                  <span className={styles.diaryHint}>已关联日记 · 点击更新</span>
                )}
              </div>
            )}

            {/* Input area */}
            <div className={styles.inputArea}>
              <button className={styles.ctxToggle} onClick={loadContextData} title="选择上下文">
                <i className="fas fa-list-ul" />
                {ctxEntries.length > 0 && <span className={styles.ctxBadge}>{ctxEntries.length}</span>}
              </button>
              <textarea
                ref={inputRef}
                className={styles.textarea}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                rows={1}
                disabled={streaming}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || streaming}
              ><i className="fas fa-paper-plane" /></button>
            </div>

            {/* Context picker panel */}
            {ctxOpen && <div className={styles.ctxOverlay} onClick={() => setCtxOpen(false)} />}
            <div className={`${styles.ctxPanel} ${ctxOpen ? styles.ctxPanelOpen : ''}`}>
              <div className={styles.ctxHeader}>
                <span>选择上下文数据</span>
                <button onClick={() => setCtxOpen(false)}><i className="fas fa-times" /></button>
              </div>
              <div className={styles.ctxBody}>
                {/* Selected */}
                <div className={styles.ctxSection}>
                  <h4>已选中</h4>
                  {ctxEntries.length === 0 ? (
                    <p className={styles.ctxEmpty}>暂无</p>
                  ) : (
                    ctxEntries.map(e => (
                      <div key={e.id} className={styles.ctxSelItem}>
                        <span>{e.date} {e.title}</span>
                        <button onClick={() => removeContext(e.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Schedules */}
                <div className={styles.ctxSection}>
                  <h4>日程记录</h4>
                  {ctxSchedLoading ? <p className={styles.ctxEmpty}>加载中...</p> :
                   schedules.length === 0 ? <p className={styles.ctxEmpty}>暂无</p> :
                   schedules.map(s => (
                    <label key={s.id} className={styles.ctxItem}>
                      <input type="checkbox" checked={isSchedSelected(s.id)} onChange={() => toggleContext('schedule', s.id)} />
                      <span>{s.date} {s.title}</span>
                      <span style={{ color: getMoodColor(s.feeling), background: getMoodBgColor(s.feeling), padding: '0 4px', borderRadius: 3, fontSize: 11, flexShrink: 0 }}>
                        {formatFeeling(s.feeling)}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Diaries */}
                <div className={styles.ctxSection}>
                  <h4>日记记录</h4>
                  {ctxDiaryLoading ? <p className={styles.ctxEmpty}>加载中...</p> :
                   diaries.length === 0 ? <p className={styles.ctxEmpty}>暂无</p> :
                   diaries.map(d => (
                    <label key={d.id} className={styles.ctxItem}>
                      <input type="checkbox" checked={isDiarySelected(d.id)} onChange={() => toggleContext('diary', d.id)} />
                      <span>{d.date} {d.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
