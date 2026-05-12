import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { MessageResponse, SessionResponse } from '../../types';
import styles from './AI.module.css';

const API_BASE_URL = '/api';

interface AIChatPanelProps {
  sessionId: number;
  rateLimited: boolean;
  onRateLimited?: () => void;
  onQuotaUpdate?: (headers: Headers) => void;
}

export default function AIChatPanel({ sessionId, rateLimited, onRateLimited, onQuotaUpdate }: AIChatPanelProps) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [waitingFirstChunk, setWaitingFirstChunk] = useState(false);

  const { token } = useAuth();
  const { addToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load session detail on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
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

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // ── Focus textarea after loading ──
  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

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
      let fullContent = '';

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
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              // Check for stream-end marker
              if (data === '[DONE]') break;
              try {
                // Try to parse as JSON (may contain content field)
                const parsed = JSON.parse(data);
                const chunk = parsed.content ?? parsed.text ?? parsed.message ?? data;
                fullContent += chunk;
              } catch {
                // Plain text chunk
                fullContent += data;
              }
              setWaitingFirstChunk(false);
            }
          }
        }

        setStreamingContent(fullContent);
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.content ?? parsed.text ?? parsed.message ?? data;
              fullContent += chunk;
            } catch {
              fullContent += data;
            }
          }
        }
      }

      // Add final assistant message
      if (fullContent.trim()) {
        const assistantMsg: MessageResponse = {
          id: Date.now(),
          role: 'assistant',
          content: fullContent.trim(),
          sequenceNum: messages.length + 2,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      const msg = err instanceof Error ? err.message : '发送消息失败';
      addToast(msg, 'error');
    } finally {
      setStreaming(false);
      setStreamingContent('');
      setWaitingFirstChunk(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages.length, sessionId, token, addToast, onRateLimited, onQuotaUpdate, rateLimited]);

  // ── Key handler: Enter to send, Shift+Enter for newline ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className={styles.chatPanel}>
        <div className={styles.emptyChat}>
          <div className={styles.spinner} />
          <span>加载会话中...</span>
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
        {messages.length === 0 && (
          <div className={styles.emptyChat}>
            <i className="fas fa-comments" style={{ fontSize: 40, color: '#ccc' }} />
            <p>开始和 AI 对话吧</p>
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
              <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && streamingContent && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant} ${styles.streamingBubble}`}>
              <div className={styles.messageAvatar}>
                <i className="fas fa-robot" />
              </div>
              <div className={styles.messageContent}>
                <div className={styles.markdown}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent}
                  </ReactMarkdown>
                </div>
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

      {/* Input area */}
      <div className={styles.chatInput}>
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
    </div>
  );
}
