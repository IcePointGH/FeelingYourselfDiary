import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import DateInput from '../../components/DateInput/DateInput';
import StatCard from '../../components/StatCard/StatCard';
import MoodTrendChart from './MoodTrendChart';
import MoodSummary from './MoodSummary';
import { ANALYSIS_API, AI_API } from '../../services/api';
import type { DailyAnalysis, WeeklyAnalysis, MonthlyAnalysis, AnalysisData } from '../../types';
import './Analysis.css';

type TabType = 'daily' | 'weekly' | 'monthly' | 'full';
type ViewMode = 'chart' | 'ai';

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
}

function isoWeekToDate(weekStr: string): string {
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

export default function AnalysisPage() {
  const [tab, setTab] = useState<TabType>('daily');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // AI analysis state
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStats, setAiStats] = useState<{ scheduleCount: number; diaryCount: number; dateRange: string } | null>(null);
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const getWeekString = (d: Date) => {
    const year = d.getFullYear();
    const week = String(getWeekNumber(d)).padStart(2, '0');
    return `${year}-W${week}`;
  };

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
      const msg = err instanceof Error ? err.message : '分析失败, 请重试';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tab, date, month, addToast]);

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiResult(null);
    setAiStats(null);
    try {
      const body: Record<string, string> = {};
      if (tab === 'daily') body.date = date;
      else if (tab === 'weekly') body.date = isoWeekToDate(date);
      else if (tab === 'monthly') body.month = month;
      // full: no body needed for full-history analysis
      const res = await apiFetch(AI_API.analyze, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAiResult(res.markdown || '分析完成');
      setAiStats({ scheduleCount: res.scheduleCount ?? 0, diaryCount: res.diaryCount ?? 0, dateRange: res.dateRange ?? '' });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'AI分析失败', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setAiResult(null);
    setAiStats(null);
    const d = new Date();
    if (tab === 'daily') setDate(d.toISOString().split('T')[0]);
    else if (tab === 'weekly') setDate(getWeekString(d));
    else setMonth(d.toISOString().slice(0, 7));
  }, [tab]);

  const chartData = useMemo(() => {
    if (!data?.dailyTotals) return [];
    return Object.entries(data.dailyTotals).map(([date, value]) => ({ date, value }));
  }, [data]);

  const tabLabels: Record<TabType, string> = { daily: '日分析', weekly: '周分析', monthly: '月分析', full: '全历史分析' };

  return (
    <div className="analysis-page">
      <div className="card">
        <div className="analysis-header-row">
          <h2>数据分析</h2>
        </div>

        <div className="tab-bar">
          {(Object.keys(tabLabels) as TabType[]).map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => { setTab(t); if (t === 'full') setViewMode('ai'); }}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab !== 'full' && (
          <div className="form-group">
            {tab === 'monthly' ? (
              <DateInput type="month" value={month} onChange={v => setMonth(v)} />
            ) : tab === 'weekly' ? (
              <DateInput type="week" value={date} onChange={v => setDate(v)} />
            ) : (
              <DateInput type="date" value={date} onChange={v => setDate(v)} />
            )}
          </div>
        )}

        {tab !== 'full' && (
          <div className="analyze-row">
            <button
              className={`analyze-btn ${viewMode === 'ai' ? 'ai-analyze-btn' : ''}`}
              onClick={viewMode === 'ai' ? handleAiAnalyze : handleAnalyze}
              disabled={loading || aiLoading}
            >
              {loading || aiLoading ? '分析中...' : viewMode === 'ai' ? 'AI智能分析' : '图表分析'}
            </button>
            <button
              className="view-toggle-btn"
              onClick={() => { setViewMode(v => v === 'chart' ? 'ai' : 'chart'); setData(null); setAiResult(null); }}
              title={viewMode === 'chart' ? '切换到AI智能分析' : '切换到图表分析'}
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
              disabled={aiLoading}
            >
              {aiLoading ? 'AI分析中...' : 'AI智能分析'}
            </button>
          </div>
        )}

        {viewMode === 'ai' && aiResult && (
              <div className="ai-result-card">
                {aiStats && (
                  <div className="ai-stats">
                    <span>日程 {aiStats.scheduleCount} 条</span>
                    <span>日记 {aiStats.diaryCount} 条</span>
                    {aiStats.dateRange && <span>{aiStats.dateRange}</span>}
                  </div>
                )}
                <div className="ai-markdown" dangerouslySetInnerHTML={{ __html: aiResult.replace(/\n/g, '<br/>') }} />
              </div>
            )}
      </div>

      {viewMode === 'chart' && data && (
        <>
          {error && <div className="error-message">{error}</div>}
          {data.itemCount === 0 && (
            <div className="empty-state">
              <p>暂无记录</p>
              <span>该时间段内没有日程记录，快去添加吧～</span>
            </div>
          )}
          <div className="stats-row">
            <StatCard title="情绪总和" value={data.totalFeeling > 0 ? `+${data.totalFeeling}` : String(data.totalFeeling)} />
            <StatCard title="事项数量" value={data.itemCount} />
            <StatCard title="平均情绪" value={data.averageFeeling > 0 ? `+${data.averageFeeling.toFixed(1)}` : data.averageFeeling.toFixed(1)} />
          </div>

          {data.dailyTotals && data.itemCount > 0 && (
            <MoodTrendChart tab={tab === 'full' ? 'monthly' : tab} chartData={chartData} month={tab === 'monthly' ? month : undefined} />
          )}

          {data.itemCount > 0 && (
            <MoodSummary tab={tab === 'full' ? 'monthly' : tab} items={data.items} />
          )}
        </>
      )}
    </div>
  );
}
