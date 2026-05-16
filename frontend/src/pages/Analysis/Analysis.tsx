import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { useAiAnalysis } from '../../hooks/useAiAnalysis';
import { useTabCache } from '../../hooks/useTabCache';
import DateInput from '../../components/DateInput/DateInput';
import StatCard from '../../components/StatCard/StatCard';
import MoodTrendChart from './MoodTrendChart';
import MoodSummary from './MoodSummary';
import StagedProgress from './StagedProgress';
import LetterReveal from './LetterReveal';
import StructuredReportView from './report/StructuredReportView';
import { ANALYSIS_API } from '../../services/api';
import type {
  DailyAnalysis,
  WeeklyAnalysis,
  MonthlyAnalysis,
  AnalysisData,
} from '../../types';
import type { AiAnalysisState } from '../../hooks/useAiAnalysis';
import './Analysis.css';

// ─── Types ───────────────────────────────────────────────

type TabType = 'daily' | 'weekly' | 'monthly' | 'full';
type ViewMode = 'chart' | 'ai';

/** Lightweight per-tab snapshot (AI state is a single object from the hook) */
interface TabSnapshot {
  data: AnalysisData | null;
  viewMode: ViewMode;
  date: string;
  month: string;
  aiState: AiAnalysisState | null;
}

// ─── Pure helpers ────────────────────────────────────────

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
}

function isoWeekToDate(weekStr: string): string {
  if (!weekStr || !weekStr.includes('-W')) return '';
  const [yearStr, weekStrNum] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStrNum, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(Date.UTC(year, 0, 4 - jan4Day + 1));
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return targetMonday.toISOString().split('T')[0];
}

function getWeekString(d: Date) {
  const year = d.getFullYear();
  const week = String(getWeekNumber(d)).padStart(2, '0');
  return `${year}-W${week}`;
}

// ─── Component ───────────────────────────────────────────

export default function AnalysisPage() {
  // ── Tab + view state ──
  const [tab, setTab] = useState<TabType>('daily');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // ── Chart analysis state ──
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Dependencies ──
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // ── AI analysis state machine (extracted hook) ──
  const ai = useAiAnalysis({ apiFetch, addToast });

  // Track which tab started the current AI analysis — prevents cross-tab UI leakage
  const [aiTab, setAiTab] = useState<TabType | null>(null);

  // ── Selected-day drill-down ──
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Tab cache ──
  const cache = useTabCache<TabSnapshot>();

  // ── Defaults factory ──
  const getDefaultSnapshot = (t: TabType): TabSnapshot => {
    const d = new Date();
    return {
      data: null,
      viewMode: t === 'full' ? 'ai' : 'chart',
      date: t === 'monthly' ? d.toISOString().slice(0, 7)
        : (t === 'weekly' ? getWeekString(d) : d.toISOString().split('T')[0]),
      month: d.toISOString().slice(0, 7),
      aiState: null,
    };
  };

  // ── Chart analysis ──
  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url: string;
      if (tab === 'daily') url = `${ANALYSIS_API.daily}?date=${date}`;
      else if (tab === 'weekly') url = `${ANALYSIS_API.weekly}?date=${isoWeekToDate(date)}`;
      else url = `${ANALYSIS_API.monthly}?month=${month}`;

      const result = await apiFetch(url);
      if (tab === 'daily') {
        const d = result as DailyAnalysis;
        setData({ totalFeeling: d.totalFeeling, itemCount: d.itemCount, averageFeeling: d.averageFeeling, items: d.items });
      } else if (tab === 'weekly') {
        const w = result as WeeklyAnalysis;
        setData({ totalFeeling: w.totalFeeling, itemCount: w.itemCount, averageFeeling: w.averageFeeling, dailyTotals: w.dailyTotals, items: w.items });
      } else {
        const m = result as MonthlyAnalysis;
        setData({ totalFeeling: m.totalFeeling, itemCount: m.itemCount, averageFeeling: m.averageFeeling, dailyTotals: m.dailyTotals, items: m.items });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分析失败，请重试';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tab, date, month, addToast]);

  // ── AI analysis trigger ──
  const buildDateRange = useCallback((): { startDate: string; endDate: string } => {
    if (tab === 'daily') return { startDate: date, endDate: date };
    if (tab === 'weekly') {
      const monday = isoWeekToDate(date);
      const sun = new Date(monday);
      sun.setDate(sun.getDate() + 6);
      return { startDate: monday, endDate: sun.toISOString().split('T')[0] };
    }
    if (tab === 'monthly') {
      const [y, m] = month.split('-').map(Number);
      const first = `${month}-01`;
      const last = new Date(y!, m!, 0).toISOString().split('T')[0];
      return { startDate: first, endDate: last };
    }
    return { startDate: '2000-01-01', endDate: new Date().toISOString().split('T')[0] };
  }, [tab, date, month]);

  const handleAiAnalyze = useCallback(() => {
    setAiTab(tab);
    ai.analyze(buildDateRange());
  }, [ai, buildDateRange, tab]);

  // ── Tab switch: save → restore (do NOT abort AI — let it complete in background) ──
  useEffect(() => {
    const prev = cache.prevKey;
    if (prev) {
      // Save current tab state. If AI is in progress, save null to avoid
      // caching transient progress — the analysis will complete and update
      // the hook state directly.
      const aiState: AiAnalysisState | null =
        ai.state.phase === 'progress' ? null : { ...ai.state };
      cache.save(prev, { data, viewMode, date, month, aiState });
    }

    // Restore target tab from cache, or use defaults
    const cached = cache.get(tab);
    if (cached) {
      setData(cached.data);
      setViewMode(cached.viewMode);
      setDate(cached.date);
      setMonth(cached.month);
    } else {
      const def = getDefaultSnapshot(tab);
      setData(def.data);
      setViewMode(def.viewMode);
      setDate(def.date);
      setMonth(def.month);
    }
    setError('');

    cache.track(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => ai.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.abort]);

  // ── Derived ──
  const chartData = useMemo(() => {
    // Daily: map items sorted by time, use time as X-axis label
    if (tab === 'daily') {
      if (!data?.items || data.items.length === 0) return [];
      return [...data.items]
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .map(item => ({
          date: item.time?.slice(0, 5) || item.title || `#${item.id}`,
          value: item.feeling,
        }));
    }

    if (!data?.dailyTotals || (tab !== 'weekly' && tab !== 'monthly')) return [];

    // Guard: stale date format from previous tab (e.g. monthly→weekly)
    if (tab === 'weekly' && !date.includes('-W')) return [];
    if (tab === 'monthly' && !month) return [];

    // Determine full date range
    let start: Date;
    let end: Date;
    if (tab === 'weekly') {
      start = new Date(isoWeekToDate(date));
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else {
      // monthly
      start = new Date(`${month}-01`);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    // Fill all dates in range; mark missing as filler
    const result: { date: string; value: number; isFiller: boolean }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateKey = cursor.toISOString().split('T')[0];
      if (dateKey in data.dailyTotals) {
        result.push({ date: dateKey, value: data.dailyTotals[dateKey]!, isFiller: false });
      } else {
        result.push({ date: dateKey, value: 0, isFiller: true });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [data, tab, date, month]);

  const handleSelectChartDate = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const navigateToHistory = useCallback(() => {
    if (selectedDate) {
      navigate('/history', { state: { date: selectedDate } });
    }
  }, [selectedDate, navigate]);

  // ── Selected-day summary (frontend-driven from existing items) ──
  const selectedDaySummary = useMemo(() => {
    if (!selectedDate || !data?.items) return null;
    const dayItems = data.items.filter((it) => it.date === selectedDate);
    if (dayItems.length === 0) return null;
    const avg =
      dayItems.reduce((sum, it) => sum + it.feeling, 0) / dayItems.length;
    return {
      date: selectedDate,
      count: dayItems.length,
      averageFeeling: avg,
      items: dayItems,
    };
  }, [selectedDate, data]);

  const tabLabels: Record<TabType, string> = { daily: '日', weekly: '周', monthly: '月', full: '全部' };

  // ── AI state shortcuts ──
  const s = ai.state;

  // ── Render ──
  return (
    <div className="analysis-page">
      <div className="card analysis-control-card">
        <div className="analysis-header-row">
          <h2>数据分析</h2>
        </div>

        <div className="tab-bar">
          {(Object.keys(tabLabels) as TabType[]).map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab !== 'full' && (
          <div className="form-group">
            {tab === 'monthly' ? (
              <DateInput type="month" value={month} onChange={value => setMonth(value)} />
            ) : tab === 'weekly' ? (
              <DateInput type="week" value={date} onChange={value => setDate(value)} />
            ) : (
              <DateInput type="date" value={date} onChange={value => setDate(value)} />
            )}
          </div>
        )}

        {tab !== 'full' && (
          <div className="analyze-row">
            <button
              className={`analyze-btn ${viewMode === 'ai' ? 'ai-analyze-btn' : ''}`}
              onClick={viewMode === 'ai' ? handleAiAnalyze : handleAnalyze}
              disabled={loading || s.loading}
            >
              {loading || s.loading ? '分析中...' : viewMode === 'ai' ? '生成报告' : '图表分析'}
            </button>
            <button
              className="view-toggle-btn"
              onClick={() => {
                ai.abort();
                setViewMode(current => current === 'chart' ? 'ai' : 'chart');
                setData(null);
                cache.remove(tab);
              }}
              title={viewMode === 'chart' ? '切换到 AI 智能分析' : '切换到图表分析'}
            >
              <i className="fas fa-exchange-alt" />
              <span>{viewMode === 'chart' ? 'AI' : '图表'}</span>
            </button>
          </div>
        )}

        {tab === 'full' && (
          <div className="analyze-row">
            <button
              className="analyze-btn ai-analyze-btn"
              onClick={handleAiAnalyze}
              disabled={s.loading}
            >
              {s.loading ? '分析中...' : '生成报告'}
            </button>
          </div>
        )}

        {viewMode === 'ai' && aiTab === tab && (
          <>
            {s.phase === 'progress' && <StagedProgress isRunning={s.loading || s.settling} settling={s.settling} startedAt={s.startedAt} />}

            {s.phase === 'letter' && s.report && (
              <LetterReveal
                reportTitle={s.report.title}
                onOpen={ai.openReport}
                onViewDirect={ai.openReport}
              />
            )}

            {s.phase === 'report' && s.report && s.evidence && (
              <div className="ai-report-wrapper">
                {s.stats && (
                  <div className="ai-stats">
                    <span>日程 {s.stats.scheduleCount} 条</span>
                    <span>日记 {s.stats.diaryCount} 条</span>
                    {s.stats.dateRange && <span>{s.stats.dateRange}</span>}
                  </div>
                )}
                <StructuredReportView report={s.report} evidence={s.evidence} />
              </div>
            )}

            {s.phase === 'error' && (
              <div className="error-message">
                <p>{s.errorMsg || 'AI 分析暂时无法完成'}</p>
                <button className="analyze-btn ai-analyze-btn" onClick={handleAiAnalyze}>
                  重试
                </button>
              </div>
            )}

            {s.phase === 'idle' && s.result && (
              <div className="ai-result-card">
                {s.stats && (
                  <div className="ai-stats">
                    <span>日程 {s.stats.scheduleCount} 条</span>
                    <span>日记 {s.stats.diaryCount} 条</span>
                    {s.stats.dateRange && <span>{s.stats.dateRange}</span>}
                  </div>
                )}
                <div className="ai-markdown" dangerouslySetInnerHTML={{ __html: s.result.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </>
        )}
      </div>

      {viewMode === 'chart' && data && (
        <>
          {error && <div className="error-message">{error}</div>}
          {data.itemCount === 0 && (
            <div className="empty-state">
              <p>暂无记录</p>
              <span>该时间段内没有日程记录，去添加一些日程后再分析。</span>
            </div>
          )}
          <div className="stats-row">
            <StatCard title="情绪总和" value={data.totalFeeling > 0 ? `+${data.totalFeeling}` : String(data.totalFeeling)} />
            <StatCard title="事项数量" value={data.itemCount} />
            <StatCard title="平均情绪" value={data.averageFeeling > 0 ? `+${data.averageFeeling.toFixed(1)}` : data.averageFeeling.toFixed(1)} />
          </div>

          {/* Selected-day drill-down summary */}
          {selectedDaySummary && (
            <div className="card selected-day-summary">
              <div className="selected-day-header">
                <h3>{selectedDaySummary.date}</h3>
                <button className="close-summary-btn" onClick={() => setSelectedDate(null)}>
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="selected-day-stats">
                <div className="day-stat">
                  <span className="day-stat-label">平均情绪</span>
                  <span className={`day-stat-value ${selectedDaySummary.averageFeeling > 0 ? 'positive' : selectedDaySummary.averageFeeling < 0 ? 'negative' : ''}`}>
                    {selectedDaySummary.averageFeeling > 0 ? '+' : ''}{selectedDaySummary.averageFeeling.toFixed(1)}
                  </span>
                </div>
                <div className="day-stat">
                  <span className="day-stat-label">记录数</span>
                  <span className="day-stat-value">{selectedDaySummary.count}</span>
                </div>
              </div>
              {selectedDaySummary.items.length > 0 && (
                <div className="day-evidence">
                  {selectedDaySummary.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="evidence-item">
                      <span className="evidence-title">{item.title || '未命名日程'}</span>
                      <span className={`evidence-feeling feel${item.feeling >= 0 ? '-' : '--'}${Math.abs(item.feeling as import('../../types').FeelingValue)}`}>
                        {item.feeling > 0 ? '+' : ''}{item.feeling}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button className="view-history-btn" onClick={navigateToHistory}>
                <i className="fas fa-external-link-alt" style={{ marginRight: 6 }} />
                查看当天记录
              </button>
            </div>
          )}

          {(data.dailyTotals || tab === 'daily') && data.itemCount > 0 && (
            <MoodTrendChart tab={tab === 'full' ? 'monthly' : tab} chartData={chartData} month={tab === 'monthly' ? month : undefined} onSelectDate={tab !== 'daily' ? handleSelectChartDate : undefined} />
          )}

          {data.itemCount > 0 && (
            <MoodSummary tab={tab === 'full' ? 'monthly' : tab} items={data.items} />
          )}
        </>
      )}
    </div>
  );
}
