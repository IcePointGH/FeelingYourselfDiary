import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useApi } from '../../hooks/useApi';
import { AI_API } from '../../services/api';
import type { ContextEntry, MessageResponse, SessionResponse } from '../../types';
import ContextPicker from './ContextPicker';
import EmptyState from '../../components/EmptyState/EmptyState';
import Skeleton from '../../components/Skeleton/Skeleton';
import styles from './AI.module.css';

const API_BASE_URL = '/api';

interface AIChatPanelProps {
  sessionId: number;
  rateLimited: boolean;
  onRateLimited?: () => void;
  onQuotaUpdate?: (headers: Headers) => void;
  onComplete?: () => void;
}

export default function AIChatPanel({ sessionId, rateLimited, onRateLimited, onQuotaUpdate, onComplete }: AIChatPanelProps) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingFirstChunk, setWaitingFirstChunk] = useState(false);

  const { token } = useAuth();
  const { addToast } = useToast();
  const { apiFetch } = useApi();
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [showContextPicker, setShowContextPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef('');
  const rafIdRef = useRef<number | null>(null);

  // ── Load session detail on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Only show loading on first mount (no messages yet), not on session switch
      if (messages.length === 0) setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/ai/sessions/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (res.status === 429) {
            onRateLimited?.();
            const body = await res.json().catch(() => null);
            throw new Error(body?.message || '今日AI调用次数已达上限（50次），请明天再试');
          }
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `请求失败 (${res.status})`);
        }
        // Extract quota headers on success
        if (onQuotaUpdate) onQuotaUpdate(res.headers);
        const json = await res.json();
        const data: SessionResponse = json.data ?? json;
        if (!cancelled) {
          setMessages(data.messages ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '加载会话失败';
          addToast(msg, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId, token, addToast, onRateLimited, onQuotaUpdate]);

  // ── Scroll: existing history → instant to bottom; new messages → smooth ──
  const prevMsgCountRef = useRef(-1);
  useEffect(() => {
    if (messages.length === 0) return;
    if (prevMsgCountRef.current === -1) {
      // Initial load with history: scroll to bottom instantly (no animation)
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    } else if (messages.length > prevMsgCountRef.current || streamingContent) {
      // New message arrived: smooth scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, streamingContent]);

  // ── Fetch context entries on session change ──
  const fetchContextEntries = useCallback(async () => {
    try {
      const data = await apiFetch(AI_API.sessionContext(sessionId));
      setContextEntries(data ?? []);
    } catch {
      // Silently fail — context is optional
    }
  }, [sessionId, apiFetch]);

  useEffect(() => {
    fetchContextEntries();
  }, [fetchContextEntries]);

  // ── Remove a single context entry ──
  const removeContextEntry = useCallback(async (entryId: number) => {
    try {
      await apiFetch(`${AI_API.sessionContext(sessionId)}/${entryId}`, { method: 'DELETE' });
      await fetchContextEntries();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '移除失败';
      addToast(msg, 'error');
    }
  }, [sessionId, apiFetch, fetchContextEntries, addToast]);

  // ── Copy message content ──
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      addToast('已复制', 'success');
    } catch {
      addToast('复制失败', 'error');
    }
  }, [addToast]);

  // ── Delete single message ──
  const handleDeleteMessage = useCallback(async (msgId: number) => {
    if (!window.confirm('确定删除这条消息？')) return;
    try {
      await apiFetch(AI_API.deleteMessage(msgId), { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
      addToast('消息已删除', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      addToast(msg, 'error');
    }
  }, [apiFetch, addToast]);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || rateLimited) return;

    // Add optimistic user message
    const userMsg: MessageResponse = {
      id: -Date.now(),
      role: 'user',
      content: trimmed,
      sequenceNum: messages.length + 1,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamingContent('');
    setWaitingFirstChunk(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE_URL}/ai/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });

      // Rate limit check before processing stream
      if (res.status === 429) {
        onRateLimited?.();
        let errMsg = '今日AI调用次数已达上限（50次），请明天再试';
        try {
          const errJson = await res.json();
          errMsg = errJson.message || errMsg;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      if (!res.ok && res.status !== 200) {
        // Non-streaming error — parse JSON body
        let errMsg = `AI 请求失败 (${res.status})`;
        try {
          const errJson = await res.json();
          errMsg = errJson.message || errMsg;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      // Extract quota headers on success
      if (onQuotaUpdate) onQuotaUpdate(res.headers);

      const decoder = new TextDecoder();
      let buffer = '';
      fullContentRef.current = '';

      /** Schedule a RAF-based UI update (max ~60fps, no duplicate frames) */
      const scheduleRender = () => {
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            setStreamingContent(fullContentRef.current);
            rafIdRef.current = null;
          });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events: each event ends with "\n\n"
        const parts = buffer.split('\n\n');
        // Keep the last incomplete part in buffer
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (let line of lines) {
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith('data:')) {
              const raw = line.slice(5);
              const data = raw.startsWith(' ') ? raw.slice(1) : raw;
              if (!data) continue;
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const chunk = parsed.content ?? parsed.text ?? parsed.message ?? data;
                fullContentRef.current += chunk;
              } catch {
                fullContentRef.current += data;
              }
              setWaitingFirstChunk(false);
            }
          }
        }

        scheduleRender();
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (let line of lines) {
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith('data:')) {
            const raw = line.slice(5);
            const data = raw.startsWith(' ') ? raw.slice(1) : raw;
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.content ?? parsed.text ?? parsed.message ?? data;
              fullContentRef.current += chunk;
            } catch {
              fullContentRef.current += data;
            }
          }
        }
        scheduleRender();
      }

      // Cancel any pending RAF before finalizing
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const finalContent = fullContentRef.current;

      // Add final assistant message
      if (finalContent.trim()) {
        const assistantMsg: MessageResponse = {
          id: Date.now(),
          role: 'assistant',
          content: finalContent.trim(),
          sequenceNum: messages.length + 2,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

      // Notify parent that stream completed (for sidebar refresh, etc.)
      onComplete?.();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      const msg = err instanceof Error ? err.message : '发送消息失败';
      addToast(msg, 'error');
    } finally {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setStreaming(false);
      setStreamingContent('');
      setWaitingFirstChunk(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages.length, sessionId, token, addToast, onRateLimited, onQuotaUpdate, rateLimited, onComplete]);

  // ── Key handler: Enter to send, Shift+Enter for newline ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Loading state (minimal spinner, no skeleton flash) ──
  if (loading && messages.length === 0) {
    return (
      <div className={styles.chatPanel}>
        <div className={styles.sidebarLoading}>
          <div className={styles.spinner} />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // ── Format timestamp ──
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <div className={styles.chatPanel}>
      {/* Message list */}
      <div className={styles.messageList}>
        {messages.length === 0 && !streaming && (
          <div className={styles.emptyChat}>
            <EmptyState
              icon="fa-comments"
              title="开始对话"
              description="发送第一条消息，与小七聊聊"
            />
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}
          >
            <div
              className={`${styles.messageBubble} ${
                msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant
              }`}
            >
              {/* Avatar icon */}
              {msg.role !== 'user' && (
                <div className={styles.messageAvatar}>
                  <i className="fas fa-robot" />
                </div>
              )}
              <div className={styles.messageContent}>
                {msg.role === 'user' ? (
                  <p className={styles.messageText}>{msg.content}</p>
                ) : (
                  <div className={styles.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <div className={styles.messageFooter}>
                {/* User: buttons left, time right. AI: time left, buttons right */}
                {msg.role === 'user' ? (
                  <>
                    <div className={styles.messageActions}>
                      <button className={styles.copyBtn} onClick={() => handleCopy(msg.content)} title="复制">
                        <i className="fas fa-copy" />
                      </button>
                      <button className={styles.deleteMsgBtn} onClick={() => handleDeleteMessage(msg.id)} title="删除">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                    <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                    <div className={styles.messageActions}>
                      <button className={styles.copyBtn} onClick={() => handleCopy(msg.content)} title="复制">
                        <i className="fas fa-copy" />
                      </button>
                      <button className={styles.deleteMsgBtn} onClick={() => handleDeleteMessage(msg.id)} title="删除">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming bubble — plain text for smooth 60fps rendering */}
        {streaming && streamingContent && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant} ${styles.streamingBubble}`}>
              <div className={styles.messageAvatar}>
                <i className="fas fa-robot" />
              </div>
              <div className={styles.messageContent}>
                <div className={styles.streamingText}>{streamingContent}</div>
                <span className={styles.cursor} />
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator (waiting for first chunk) */}
        {streaming && waitingFirstChunk && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant}`}>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context chips */}
      {contextEntries.length > 0 && (
        <div className={styles.contextChips}>
          <i className="fas fa-database" style={{ fontSize: 12, color: '#7C5CFC', marginRight: 4 }} />
          {contextEntries.map(entry => (
            <div key={entry.id} className={styles.contextChip}>
              <span className={styles.contextChipText}>
                [{entry.date}] {entry.title}
                {entry.type === 'schedule' && entry.feeling != null && (
                  <span className={styles.contextChipFeeling}>
                    ({entry.feeling > 0 ? '+' : ''}{entry.feeling})
                  </span>
                )}
              </span>
              <button
                className={styles.contextChipRemove}
                onClick={() => removeContextEntry(entry.id)}
                title="从上下文中移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className={styles.chatInput}>
        <button
          className={styles.contextToggle}
          onClick={() => setShowContextPicker(prev => !prev)}
          title="选择上下文数据"
        >
          <i className="fas fa-list-ul" />
          {contextEntries.length > 0 && (
            <span className={styles.contextToggleBadge}>{contextEntries.length}</span>
          )}
        </button>
        <textarea
          ref={textareaRef}
          className={styles.chatTextarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={rateLimited ? '今日次数已用完' : '输入消息，Enter 发送，Shift+Enter 换行'}
          rows={1}
          disabled={streaming || rateLimited}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || streaming || rateLimited}
          title={rateLimited ? '今日次数已用完' : '发送'}
        >
          <i className="fas fa-paper-plane" />
        </button>
      </div>

      {/* Context picker slide-out panel */}
      {showContextPicker && (
        <div className={styles.contextOverlay} onClick={() => setShowContextPicker(false)} />
      )}
      <div className={`${styles.contextPanelWrapper} ${showContextPicker ? styles.contextPanelOpen : ''}`}>
        <div className={styles.contextPanelHeader}>
          <span>选择上下文数据</span>
          <button className={styles.contextPanelClose} onClick={() => setShowContextPicker(false)}>
            <i className="fas fa-times" />
          </button>
        </div>
        <ContextPicker
          sessionId={sessionId}
          contextEntries={contextEntries}
          onContextChange={fetchContextEntries}
          onRemoveContext={removeContextEntry}
        />
      </div>
    </div>
  );
}
