import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import DateInput from '../../components/DateInput/DateInput';
import { ANALYSIS_API } from '../../services/api';
import type { DailyAnalysis, WeeklyAnalysis, MonthlyAnalysis, ScheduleItem } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Analysis.css';

type TabType = 'daily' | 'weekly' | 'monthly';

interface AnalysisData {
  totalFeeling: number;
  itemCount: number;
  averageFeeling: number;
  dailyTotals?: Record<string, number>;
  items?: ScheduleItem[];
}

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { apiFetch } = useApi();

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
      if (tab === 'daily') {
        url = `${ANALYSIS_API.daily}?date=${date}`;
      } else if (tab === 'weekly') {
        url = `${ANALYSIS_API.weekly}?date=${isoWeekToDate(date)}`;
      } else {
        url = `${ANALYSIS_API.monthly}?month=${month}`;
      }

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
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tab, date, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    const d = new Date();
    if (tab === 'daily') setDate(d.toISOString().split('T')[0]);
    else if (tab === 'weekly') setDate(getWeekString(d));
    else setMonth(d.toISOString().slice(0, 7));
  }, [tab]);

  const formatFeelingValue = (value: number): string => {
    if (value === 0) return '0';
    if (value > 0) return `+${value}`;
    return `${value}`;
  };

  const chartData = useMemo(() => {
    if (!data?.dailyTotals) return [];
    return Object.entries(data.dailyTotals).map(([date, value]) => ({ date, value }));
  }, [data?.dailyTotals]);

  const formatXAxisDate = (dateStr: string): string => {
    if (tab === 'monthly') {
      const day = dateStr.split('-')[2];
      return day.startsWith('0') ? day.slice(1) : day;
    }
    const parts = dateStr.split('-');
    return `${parts[1]}-${parts[2]}`;
  };

  const groupedItems = (() => {
    if (!data?.items || data.items.length === 0) return null;
    if (tab === 'daily') return { '': data.items };
    const groups: Record<string, ScheduleItem[]> = {};
    for (const item of data.items) {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    }
    return groups;
  })();

  return (
    <div className="analysis-page">
      <div className="card">
        <h2>数据分析</h2>

        <div className="tab-bar">
          {(['daily', 'weekly', 'monthly'] as TabType[]).map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'daily' ? '日分析' : t === 'weekly' ? '周分析' : '月分析'}
            </button>
          ))}
        </div>

        <div className="form-group">
          {tab === 'monthly' ? (
            <DateInput type="month" value={month} onChange={v => setMonth(v)} />
          ) : tab === 'weekly' ? (
            <DateInput type="week" value={date} onChange={v => setDate(v)} />
          ) : (
            <DateInput type="date" value={date} onChange={v => setDate(v)} />
          )}
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? '分析中...' : '分析'}
        </button>
      </div>

      {data && (
        <>
          {error && <div className="error-message">{error}</div>}
          {data.itemCount === 0 && (
            <div className="empty-state">
              <p>暂无记录</p>
              <span>该时间段内没有日程记录，快去添加吧～</span>
            </div>
          )}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{data.totalFeeling > 0 ? '+' : ''}{data.totalFeeling}</div>
              <div className="stat-label">情绪总和</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.itemCount}</div>
              <div className="stat-label">事项数量</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.averageFeeling > 0 ? '+' : ''}{data.averageFeeling.toFixed(1)}</div>
              <div className="stat-label">平均情绪</div>
            </div>
          </div>

          {data.dailyTotals && data.itemCount > 0 && (
            <div className="card">
              <h2>情绪波动</h2>
              {tab === 'monthly' && (
                <div className="chart-month-title">
                  {`${month.split('-')[0]}年${parseInt(month.split('-')[1], 10)}月`}
                </div>
              )}
              <div className={tab === 'monthly' ? 'chart-scroll-wrapper' : undefined}>
                <div className={`chart-container${tab === 'monthly' ? ' monthly' : ''}`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxisDate}
                        tick={{ fontSize: 11, fill: '#a69c97' }}
                        axisLine={{ stroke: '#e0d9d0' }}
                        tickLine={{ stroke: '#e0d9d0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#a69c97' }}
                        axisLine={{ stroke: '#e0d9d0' }}
                        tickLine={{ stroke: '#e0d9d0' }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255,255,255,0.95)',
                          border: '1px solid #e0d9d0',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#5a534e',
                        }}
                        formatter={(value) => [formatFeelingValue(Number(value)), '情绪值']}
                        labelFormatter={(label) => formatXAxisDate(String(label))}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#a69c97"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#a69c97' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {data.itemCount > 0 && data.items && data.items.length > 0 && (
            <div className="card details-section">
              <h2>事项详情</h2>
              {groupedItems && Object.entries(groupedItems).map(([dateKey, items]) => (
                <div key={dateKey || 'daily'} className="details-group">
                  {dateKey && <div className="details-date-title">{dateKey}</div>}
                  <div className="details-list">
                    {items.map(item => (
                      <div key={item.id} className="detail-item">
                        <div className="detail-info">
                          <div className="detail-title">{item.title}</div>
                          <div className="detail-time">
                            {item.date}{item.time ? ` ${item.time}` : ''}
                          </div>
                        </div>
                        <div className={`detail-feeling ${item.feeling > 0 ? 'positive' : item.feeling < 0 ? 'negative' : 'neutral'}`}>
                          {formatFeelingValue(item.feeling)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.itemCount > 0 && (!data.items || data.items.length === 0) && (
            <div className="card details-section">
              <h2>事项详情</h2>
              <div className="details-empty">暂无事项记录</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
