import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApi, RateLimitError } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import { AI_API } from '../../services/api';
import type { AnalyzeRequest, AnalyzeResponse } from '../../types';
import AIChatPanel from './AIChatPanel';
import SessionSidebar from './SessionSidebar';
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
  { key: 'full', label: '全历史', enabled: false },
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

  // ── Create new chat session ──
  const handleNewSession = useCallback(async () => {
    try {
      const data = await apiFetch(AI_API.sessions, {
        method: 'POST',
        body: JSON.stringify({ title: '新对话', sessionType: 'chat' }),
      }) as { id: number };
      setActiveSessionId(data.id);
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
          />
          {activeSessionId ? (
            <AIChatPanel
              key={activeSessionId}
              sessionId={activeSessionId}
              rateLimited={rateLimited}
              onRateLimited={handleChatRateLimited}
              onQuotaUpdate={handleChatQuotaUpdate}
            />
          ) : (
            <div className={styles.chatPanel}>
              <div className={styles.emptyChat}>
                <i className="fas fa-comments" style={{ fontSize: 40, color: '#ccc' }} />
                <p>选择或创建一个会话开始对话</p>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  // ════════════════════════════════════════════
  //  RANGE MODE (existing, unchanged)
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
      </div>

      {/* Result area */}
      {loading && (
        <div className={`${styles.card} ${styles.resultArea}`}>
          <div className={styles.resultLoading}>
            <div className={styles.spinner} />
            <span>AI 正在分析您的数据，请稍候...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className={`${styles.card} ${styles.resultArea}`}>
          <div className={styles.resultError}>
            <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }} />
            {error}
          </div>
        </div>
      )}

      {result && !loading && (
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
    </div>
  );
}
