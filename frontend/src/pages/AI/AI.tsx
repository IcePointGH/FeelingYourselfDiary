import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApi, RateLimitError } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import { AI_API } from '../../services/api';
import type { AnalyzeRequest, AnalyzeResponse, SessionListItem, SessionResponse } from '../../types';
import AIChatPanel from './AIChatPanel';
import SessionSidebar from './SessionSidebar';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './AI.module.css';

type ModeType = 'chat' | 'range' | 'full';

const CONSENT_KEY = 'ai-privacy-consent';
const MAX_QUOTA = 50;

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function defaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

const MODE_LABELS: { key: ModeType; label: string; enabled: boolean }[] = [
  { key: 'chat', label: '对话分析', enabled: true },
  { key: 'range', label: '时间区间', enabled: true },
  { key: 'full', label: '全历史', enabled: true },
];

/** Extract quota from response headers */
function extractQuotaFromHeaders(headers: Headers): { remaining: number; max: number } | null {
  const remain = headers.get('X-RateLimit-Remaining');
  if (remain === null) return null;
  return { remaining: parseInt(remain, 10), max: MAX_QUOTA };
}

export default function AIPage() {
  const [consented, setConsented] = useState<boolean | null>(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  });
  const [mode, setMode] = useState<ModeType>('range');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState('');

  // ── Rate limit & quota state ──
  const [quota, setQuota] = useState<{ remaining: number; max: number }>({ remaining: MAX_QUOTA, max: MAX_QUOTA });
  const [rateLimited, setRateLimited] = useState(false);

  // ── Chat mode state ──
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // ── Sidebar refresh trigger (incremented to re-fetch session list) ──
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  // ── Full-history mode state ──
  const [fullSessionId, setFullSessionId] = useState<number | null>(null);
  const [fullStatus, setFullStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [fullProgress, setFullProgress] = useState(0);
  const [fullResult, setFullResult] = useState<string>('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Range mode history ──
  const [rangeView, setRangeView] = useState<'list' | 'detail'>('list');
  const [rangeSessions, setRangeSessions] = useState<SessionListItem[]>([]);
  const [rangeDetailResult, setRangeDetailResult] = useState<string>('');

  // ── Full mode history ──
  const [fullView, setFullView] = useState<'list' | 'detail'>('list');
  const [fullSessions, setFullSessions] = useState<SessionListItem[]>([]);
  const [fullDetailResult, setFullDetailResult] = useState<string>('');

  const { apiFetch, lastHeadersRef } = useApi();
  const { addToast } = useToast();

  // ── Reset rate-limited state on new day (check every 60s) ──
  useEffect(() => {
    const checkReset = () => {
      if (rateLimited) {
        // If we were rate limited, try resetting (quota resets at midnight)
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        // If it's past midnight since we last checked, reset
        setRateLimited(false);
        setQuota({ remaining: MAX_QUOTA, max: MAX_QUOTA });
      }
    };
    // Check on mount and every 60s
    checkReset();
    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  }, [rateLimited]);

  const handleConsent = useCallback((agreed: boolean) => {
    localStorage.setItem(CONSENT_KEY, String(agreed));
    setConsented(agreed);
  }, []);

  // ── Quota tracking helper ──
  const handleQuotaHeaders = useCallback((headers: Headers) => {
    const q = extractQuotaFromHeaders(headers);
    if (q) {
      setQuota(q);
      setRateLimited(false);
    }
  }, []);

  // ── Update quota from last API response headers ──
  const updateQuotaFromLastCall = useCallback(() => {
    if (lastHeadersRef.current) {
      handleQuotaHeaders(lastHeadersRef.current);
    }
  }, [lastHeadersRef, handleQuotaHeaders]);

  // ── Handle rate limit error ──
  const handleRateLimited = useCallback((err: RateLimitError) => {
    setRateLimited(true);
    setQuota({ remaining: 0, max: MAX_QUOTA });
    addToast(err.message, 'error');
  }, [addToast]);

  // ── Range mode: analyze ──
  const handleAnalyze = useCallback(async () => {
    if (startDate > endDate) {
      addToast('开始日期不能晚于结束日期', 'error');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body: AnalyzeRequest = { startDate, endDate };
      const data = await apiFetch(AI_API.analyze, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as AnalyzeResponse;

      setResult(data);
      updateQuotaFromLastCall();

      if (data.scheduleCount === 0 && data.diaryCount === 0) {
        addToast('所选时段暂无数据', 'info');
      }

      // Refresh history list
      await fetchRangeSessions();
    } catch (err) {
      if (err instanceof RateLimitError) {
        handleRateLimited(err);
      } else {
        const msg = err instanceof Error ? err.message : 'AI 分析失败，请稍后重试';
        if (msg.includes('未找到')) {
          addToast(msg, 'info');
        } else {
          setError(msg);
          addToast(msg, 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, startDate, endDate, addToast, updateQuotaFromLastCall, handleRateLimited]);

  // ── Create new chat session (blocked if empty session already exists) ──
  const handleNewSession = useCallback(async () => {
    try {
      // Check if there's already an empty chat session — block creation
      const allSessions = await apiFetch(AI_API.sessions) as { id: number; sessionType: string; messageCount: number }[];
      const emptyChat = allSessions.find(s => s.sessionType === 'chat' && s.messageCount === 0);
      if (emptyChat) {
        addToast('已有空白对话，请先使用或删除后再创建', 'warning');
        setActiveSessionId(emptyChat.id);
        setSidebarRefreshTrigger(prev => prev + 1);
        return;
      }

      const data = await apiFetch(AI_API.sessions, {
        method: 'POST',
        body: JSON.stringify({ title: '新对话', sessionType: 'chat' }),
      }) as { id: number };
      setActiveSessionId(data.id);
      setSidebarRefreshTrigger(prev => prev + 1);
      updateQuotaFromLastCall();
    } catch (err) {
      if (err instanceof RateLimitError) {
        handleRateLimited(err);
      } else {
        const msg = err instanceof Error ? err.message : '创建会话失败';
        addToast(msg, 'error');
      }
    }
  }, [apiFetch, addToast, updateQuotaFromLastCall, handleRateLimited]);

  // ── Fetch range analysis history ──
  const fetchRangeSessions = useCallback(async () => {
    try {
      const data = await apiFetch(`${AI_API.sessions}?type=range`) as SessionListItem[];
      setRangeSessions(data);
    } catch { /* silent */ }
  }, [apiFetch]);

  // ── Fetch full analysis history ──
  const fetchFullSessions = useCallback(async () => {
    try {
      const data = await apiFetch(`${AI_API.sessions}?type=full`) as SessionListItem[];
      setFullSessions(data);
    } catch { /* silent */ }
  }, [apiFetch]);

  // ── View a past range analysis ──
  const handleViewRangeSession = useCallback(async (sessionId: number) => {
    try {
      const detail = await apiFetch(`${AI_API.sessions}/${sessionId}`) as SessionResponse;
      const assistantMsgs = detail.messages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0) {
        setRangeDetailResult(assistantMsgs[assistantMsgs.length - 1].content);
      }
      setRangeView('detail');
    } catch { /* silent */ }
  }, [apiFetch]);

  // ── View a past full analysis ──
  const handleViewFullSession = useCallback(async (sessionId: number) => {
    try {
      const detail = await apiFetch(`${AI_API.sessions}/${sessionId}`) as SessionResponse;
      const assistantMsgs = detail.messages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0) {
        setFullDetailResult(assistantMsgs[assistantMsgs.length - 1].content);
      }
      setFullView('detail');
    } catch { /* silent */ }
  }, [apiFetch]);

  // ── Delete a range session ──
  const handleDeleteRangeSession = useCallback(async (sessionId: number) => {
    try {
      await apiFetch(`${AI_API.sessions}/${sessionId}`, { method: 'DELETE' });
      addToast('已删除', 'success');
      await fetchRangeSessions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      addToast(msg, 'error');
    }
  }, [apiFetch, fetchRangeSessions, addToast]);

  // ── Delete a full session ──
  const handleDeleteFullSession = useCallback(async (sessionId: number) => {
    try {
      await apiFetch(`${AI_API.sessions}/${sessionId}`, { method: 'DELETE' });
      addToast('已删除', 'success');
      if (fullSessionId === sessionId) {
        setFullSessionId(null);
        setFullStatus('idle');
        setFullResult('');
      }
      await fetchFullSessions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      addToast(msg, 'error');
    }
  }, [apiFetch, fetchFullSessions, addToast, fullSessionId]);

  // ── Auto-select or create session when entering chat mode ──
  useEffect(() => {
    if (mode === 'chat' && consented === true && activeSessionId === null) {
      // Check if user already has chat sessions — reuse instead of creating duplicates
      apiFetch(AI_API.sessions)
        .then((sessions) => {
          const list = sessions as { id: number; sessionType: string }[];
          const existingChat = list.find((s) => s.sessionType === 'chat');
          if (existingChat) {
            setActiveSessionId(existingChat.id);
          } else {
            handleNewSession();
          }
        })
        .catch(() => handleNewSession());
    }
  }, [mode, consented, activeSessionId, handleNewSession, apiFetch]);

  // ── Switch session ──
  const handleSelectSession = useCallback((id: number) => {
    setActiveSessionId(id);
  }, []);

  // ── Chat panel rate limit callback ──
  const handleChatRateLimited = useCallback(() => {
    setRateLimited(true);
    setQuota({ remaining: 0, max: MAX_QUOTA });
    addToast('今日AI调用次数已达上限（50次），请明天再试', 'error');
  }, [addToast]);

  // ── Chat panel quota update callback ──
  const handleChatQuotaUpdate = useCallback((headers: Headers) => {
    handleQuotaHeaders(headers);
  }, [handleQuotaHeaders]);

  // ── Chat stream completed callback (trigger sidebar refresh after delay) ──
  const handleChatComplete = useCallback(() => {
    // Delay to let backend async title generation finish
    setTimeout(() => {
      setSidebarRefreshTrigger(prev => prev + 1);
    }, 1500);
  }, []);

  // ── Full-history: start analysis + polling ──
  const startFullAnalysis = useCallback(async () => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setFullStatus('processing');
    setFullProgress(0);
    setFullResult('');
    setError('');

    try {
      const data = await apiFetch(AI_API.sessions, {
        method: 'POST',
        body: JSON.stringify({ title: '全历史分析', sessionType: 'full' }),
      }) as { id: number };
      setFullSessionId(data.id);
      updateQuotaFromLastCall();

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const session = await apiFetch(`${AI_API.sessions}/${data.id}`) as {
            status: string;
            progress: number;
            messages?: Array<{ role: string; content: string }>;
          };
          setFullProgress(session.progress ?? 0);

          if (session.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setFullStatus('completed');
            const msgs = session.messages ?? [];
            const assistantMsgs = msgs.filter((m) => m.role === 'assistant');
            if (assistantMsgs.length > 0) {
              setFullResult(assistantMsgs[assistantMsgs.length - 1].content);
            }
            fetchFullSessions();
          } else if (session.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setFullStatus('failed');
            setError('全历史分析失败，请稍后重试');
          }
        } catch {
          // silently retry on next interval
        }
      }, 3000);
    } catch (err) {
      if (err instanceof RateLimitError) {
        handleRateLimited(err);
      } else {
        const msg = err instanceof Error ? err.message : '启动分析失败';
        setError(msg);
        addToast(msg, 'error');
      }
      setFullStatus('failed');
    }
  }, [apiFetch, addToast, updateQuotaFromLastCall, handleRateLimited]);

  // ── Fetch range analysis history when entering range mode ──
  useEffect(() => {
    if (mode === 'range' && consented === true) {
      fetchRangeSessions();
      // Reset view to list
      setRangeView('list');
      setRangeDetailResult('');
    }
  }, [mode, consented, fetchRangeSessions]);

  // ── Fetch full analysis history when entering full mode ──
  useEffect(() => {
    if (mode === 'full' && consented === true) {
      fetchFullSessions();
      // Reset view to list
      setFullView('list');
      setFullDetailResult('');
    }
  }, [mode, consented, fetchFullSessions]);

  // ── Cleanup polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Reset result when date range changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
  }, [startDate, endDate]);

  // ── Privacy consent modal ──
  if (consented === null) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalCard}>
          <div className={styles.modalIcon}>
            <i className="fas fa-shield-halting" />
          </div>
          <h2>隐私声明</h2>
          <p className={styles.modalDesc}>
            您的日程数据和日记文本将被发送至 MiniMax AI 进行分析。
            我们不会存储您的 API 调用内容于第三方服务器。
          </p>
          <div className={styles.modalBtns}>
            <button
              className={styles.modalBtnDecline}
              onClick={() => handleConsent(false)}
            >
              暂不使用
            </button>
            <button
              className={styles.modalBtnAgree}
              onClick={() => handleConsent(true)}
            >
              同意并继续
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quota badge (shared across modes) ──
  const quotaColor = quota.remaining === 0
    ? 'var(--feeling-neg)'
    : quota.remaining <= 10
      ? 'var(--feeling-mid)'
      : 'var(--feeling-pos)';

  const quotaBadge = (
    <div
      className={styles.quotaBadge}
      style={{ borderLeftColor: quotaColor }}
    >
      <i
        className={`fas fa-${quota.remaining <= 10 ? 'triangle-exclamation' : 'gauge-high'}`}
        style={{ color: quotaColor, fontSize: 14 }}
      />
      <span style={{ fontSize: 13 }}>
        今日剩余 {quota.remaining}/{quota.max} 次
      </span>
      {quota.remaining <= 10 && quota.remaining > 0 && (
        <span className={styles.quotaWarning}>
          即将用完
        </span>
      )}
      {quota.remaining === 0 && (
        <span className={styles.quotaExhausted}>
          已用完
        </span>
      )}
      {quota && quota.remaining === 0 && (
        <span className={styles.quotaExhausted}>
          已用完
        </span>
      )}
    </div>
  );

  // ── Rate-limit blocked banner ──
  const rateLimitBanner = rateLimited ? (
    <div className={styles.rateLimitBanner}>
      <i className="fas fa-circle-exclamation" />
      <span>今日AI调用次数已达上限（50次），请明天再试</span>
    </div>
  ) : null;

  // ════════════════════════════════════════════
  //  CHAT MODE
  // ════════════════════════════════════════════
  if (mode === 'chat') {
    return (
      <div className={styles.aiPage}>
        <div className={styles.header}>
          <h1>
            <i className="fas fa-robot" />
            AI 情绪分析
          </h1>
          <p className={styles.subtitle}>
            基于您的日程与日记数据，AI 为您生成个性化情绪洞察
          </p>
        </div>

        {quotaBadge}
        {rateLimitBanner}

        <div className={styles.card}>
          {/* Mode selector */}
          <div className={styles.modeTabs}>
            {MODE_LABELS.map(({ key, label, enabled }) => (
              <button
                key={key}
                className={[
                  styles.modeTab,
                  mode === key ? styles.modeTabActive : '',
                  !enabled ? styles.modeTabDisabled : '',
                ].filter(Boolean).join(' ')}
                onClick={() => enabled && setMode(key)}
                disabled={!enabled}
                title={!enabled ? '即将开放' : undefined}
              >
                {label}
                {!enabled && <span className={styles.comingSoon}>即将开放</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat layout: sidebar + panel */}
        <div className={styles.chatLayout}>
          <SessionSidebar
            activeSessionId={activeSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            refreshTrigger={sidebarRefreshTrigger}
          />
          {activeSessionId ? (
            <AIChatPanel
              key={activeSessionId}
              sessionId={activeSessionId}
              rateLimited={rateLimited}
              onRateLimited={handleChatRateLimited}
              onQuotaUpdate={handleChatQuotaUpdate}
              onComplete={handleChatComplete}
            />
          ) : (
            <div className={styles.chatPanel}>
              <div className={styles.emptyChat}>
                <EmptyState
                  icon="fa-comments"
                  title="开始对话"
                  description="选择或创建一个会话开始对话"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  // ════════════════════════════════════════════
  //  FULL-HISTORY MODE
  // ════════════════════════════════════════════
  if (mode === 'full') {
    return (
      <div className={styles.aiPage}>
        <div className={styles.header}>
          <h1>
            <i className="fas fa-robot" />
            AI 情绪分析
          </h1>
          <p className={styles.subtitle}>
            基于您的日程与日记数据，AI 为您生成个性化情绪洞察
          </p>
        </div>

        {quotaBadge}
        {rateLimitBanner}

        <div className={styles.card}>
          {/* Mode selector */}
          <div className={styles.modeTabs}>
            {MODE_LABELS.map(({ key, label, enabled }) => (
              <button
                key={key}
                className={[
                  styles.modeTab,
                  mode === key ? styles.modeTabActive : '',
                  !enabled ? styles.modeTabDisabled : '',
                ].filter(Boolean).join(' ')}
                onClick={() => enabled && setMode(key)}
                disabled={!enabled}
                title={!enabled ? '即将开放' : undefined}
              >
                {label}
                {!enabled && <span className={styles.comingSoon}>即将开放</span>}
              </button>
            ))}
          </div>

          {fullView === 'detail' ? (
            <>
              <button
                className={styles.backBtn}
                onClick={() => {
                  setFullView('list');
                  setFullDetailResult('');
                }}
              >
                <i className="fas fa-arrow-left" /> 返回新建分析
              </button>
              {fullDetailResult ? (
                <div className={styles.markdown}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fullDetailResult}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className={styles.resultError}>
                  <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
                  无法加载分析结果
                </div>
              )}
            </>
          ) : (
            <>
              {/* Full-history content */}
              <div className={styles.fullHistory}>
                {fullStatus === 'idle' && (
                  <>
                    <p className={styles.fullDesc}>
                      分析你的全部历史数据，获取深度情绪洞察
                    </p>
                    <button
                      className={styles.analyzeBtn}
                      onClick={startFullAnalysis}
                      disabled={rateLimited || consented === false}
                    >
                      {rateLimited ? (
                        '今日次数已用完'
                      ) : consented === false ? (
                        '已拒绝隐私授权，无法使用'
                      ) : (
                        <>
                          <i className="fas fa-chart-bar" />
                          开始全历史分析
                        </>
                      )}
                    </button>
                  </>
                )}

                {fullStatus === 'processing' && (
                  <>
                    <div className={styles.fullProgressBar}>
                      <div
                        className={styles.fullProgressFill}
                        style={{ width: `${fullProgress}%` }}
                      />
                    </div>
                    <p className={styles.fullStatus}>
                      正在分析... {fullProgress > 0 ? `(${fullProgress}%)` : ''}
                    </p>
                  </>
                )}

                {fullStatus === 'completed' && fullResult && (
                  <div className={styles.fullResult}>
                    <div className={styles.markdown}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {fullResult}
                      </ReactMarkdown>
                    </div>
                    <button
                      className={styles.retryBtn}
                      onClick={startFullAnalysis}
                    >
                      <i className="fas fa-redo" />
                      重新分析
                    </button>
                  </div>
                )}

                {fullStatus === 'failed' && (
                  <>
                    <div className={styles.resultError}>
                      <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
                      {error || '全历史分析失败，请稍后重试'}
                    </div>
                    <button
                      className={styles.retryBtn}
                      onClick={startFullAnalysis}
                    >
                      <i className="fas fa-redo" />
                      重新分析
                    </button>
                  </>
                )}

                {fullStatus === 'completed' && !fullResult && (
                  <div className={styles.resultError}>
                    <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
                    分析完成，但未获取到结果内容
                  </div>
                )}
              </div>

              {/* Full analysis history list */}
              {fullSessions.length > 0 ? (
                <div className={`${styles.card} ${styles.analysisHistory}`}>
                  <h3 className={styles.analysisHistoryTitle}>
                    <i className="fas fa-history" /> 分析历史
                  </h3>
                  {fullSessions.map(session => (
                    <div key={session.id} className={styles.historyItem}>
                      <div
                        className={styles.historyItemInfo}
                        onClick={() => handleViewFullSession(session.id)}
                      >
                        <span className={styles.historyItemTitle}>{session.title}</span>
                        <span className={styles.historyItemDate}>{session.createdAt}</span>
                      </div>
                      <div className={styles.historyItemActions}>
                        <button
                          className={styles.viewHistoryBtn}
                          onClick={() => handleViewFullSession(session.id)}
                          title="查看"
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <button
                          className={styles.deleteHistoryBtn}
                          onClick={() => handleDeleteFullSession(session.id)}
                          title="删除"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${styles.card} ${styles.analysisHistory}`}>
                  <h3 className={styles.analysisHistoryTitle}>
                    <i className="fas fa-history" /> 分析历史
                  </h3>
                  <p className={styles.noHistoryText}>暂无分析记录</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  RANGE MODE
  // ════════════════════════════════════════════
  return (
    <div className={styles.aiPage}>
      <div className={styles.header}>
        <h1>
          <i className="fas fa-robot" />
          AI 情绪分析
        </h1>
        <p className={styles.subtitle}>
          基于您的日程与日记数据，AI 为您生成个性化情绪洞察
        </p>
      </div>

      {quotaBadge}
      {rateLimitBanner}

      <div className={styles.card}>
        {/* Mode selector */}
        <div className={styles.modeTabs}>
          {MODE_LABELS.map(({ key, label, enabled }) => (
            <button
              key={key}
              className={[
                styles.modeTab,
                mode === key ? styles.modeTabActive : '',
                !enabled ? styles.modeTabDisabled : '',
              ].filter(Boolean).join(' ')}
              onClick={() => enabled && setMode(key)}
              disabled={!enabled}
              title={!enabled ? '即将开放' : undefined}
            >
              {label}
              {!enabled && <span className={styles.comingSoon}>即将开放</span>}
            </button>
          ))}
        </div>

        {rangeView === 'detail' ? (
          <>
            <button
              className={styles.backBtn}
              onClick={() => {
                setRangeView('list');
                setRangeDetailResult('');
              }}
            >
              <i className="fas fa-arrow-left" /> 返回新建分析
            </button>
            {rangeDetailResult ? (
              <div className={styles.markdown}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rangeDetailResult}
                </ReactMarkdown>
              </div>
            ) : (
              <div className={styles.resultError}>
                <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
                无法加载分析结果
              </div>
            )}
          </>
        ) : (
          <>
            {/* Date range — only for "range" mode */}
            <div className={styles.dateRange}>
              <div className={styles.dateInput}>
                <DateInput
                  value={startDate}
                  onChange={setStartDate}
                  type="date"
                  placeholder="开始日期"
                />
              </div>
              <span className={styles.dateSeparator}>至</span>
              <div className={styles.dateInput}>
                <DateInput
                  value={endDate}
                  onChange={setEndDate}
                  type="date"
                  placeholder="结束日期"
                />
              </div>
            </div>

            {/* Analyze button */}
            <button
              className={[
                styles.analyzeBtn,
                loading ? styles.analyzeBtnLoading : '',
              ].filter(Boolean).join(' ')}
              onClick={handleAnalyze}
              disabled={loading || consented === false || rateLimited}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  分析中...
                </>
              ) : rateLimited ? (
                '今日次数已用完'
              ) : consented === false ? (
                '已拒绝隐私授权，无法使用'
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles" />
                  开始分析
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Result area — only in list view */}
      {rangeView === 'list' && loading && (
        <div className={`${styles.card} ${styles.resultArea}`}>
          <div className={styles.resultLoading}>
            <div className={styles.spinner} />
            <span>AI 正在分析您的数据，请稍候...</span>
          </div>
        </div>
      )}

      {rangeView === 'list' && error && !loading && (
        <div className={`${styles.card} ${styles.resultArea}`}>
          <div className={styles.resultError}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
            {error}
          </div>
        </div>
      )}

      {rangeView === 'list' && result && !loading && (
        <div className={`${styles.card} ${styles.resultArea}`}>
          {/* Stats bar */}
          <div className={styles.resultStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{result.scheduleCount}</span>
              <span className={styles.statLabel}>日程条数</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{result.diaryCount}</span>
              <span className={styles.statLabel}>日记条数</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                <i className="fas fa-calendar" style={{ fontSize: 14, marginRight: 4 }} />
              </span>
              <span className={styles.statLabel}>{result.dateRange}</span>
            </div>
          </div>

          {/* Markdown content */}
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Range analysis history list */}
      {rangeView === 'list' && (
        <div className={`${styles.card} ${styles.analysisHistory}`}>
          <h3 className={styles.analysisHistoryTitle}>
            <i className="fas fa-history" /> 分析历史
          </h3>
          {rangeSessions.length === 0 ? (
            <p className={styles.noHistoryText}>暂无分析记录</p>
          ) : (
            rangeSessions.map(session => (
              <div key={session.id} className={styles.historyItem}>
                <div
                  className={styles.historyItemInfo}
                  onClick={() => handleViewRangeSession(session.id)}
                >
                  <span className={styles.historyItemTitle}>{session.title}</span>
                  <span className={styles.historyItemDate}>{session.createdAt}</span>
                </div>
                <div className={styles.historyItemActions}>
                  <button
                    className={styles.viewHistoryBtn}
                    onClick={() => handleViewRangeSession(session.id)}
                    title="查看"
                  >
                    <i className="fas fa-eye" />
                  </button>
                  <button
                    className={styles.deleteHistoryBtn}
                    onClick={() => handleDeleteRangeSession(session.id)}
                    title="删除"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
