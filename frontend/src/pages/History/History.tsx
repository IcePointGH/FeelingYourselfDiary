import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import ScheduleItemCard from '../../components/ScheduleItemCard/ScheduleItemCard';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState/PageState';
import { SCHEDULE_API, ANALYSIS_API } from '../../services/api';
import { KAOMOJI } from '../../utils/feeling';
import type { ScheduleItem, MonthlyAnalysis, FeelingValue } from '../../types';
import { generateCalendar } from '../../utils/calendar';
import './History.css';

type MonthTransitionDirection = 'prev' | 'next';

interface MonthSnapshot {
  key: string;
  direction: MonthTransitionDirection;
  days: ReturnType<typeof generateCalendar>;
  moods: Record<string, number>;
}

const FEELING_COLORS: Record<FeelingValue, string> = {
  [-3]: '#d75772',
  [-2]: '#f5867b',
  [-1]: '#fea979',
  0: '#ffe062',
  1: '#3cdfe9',
  2: '#12b8ec',
  3: '#1686ee',
};

const clampFeeling = (value: number): FeelingValue => {
  if (value <= -3) return -3;
  if (value >= 3) return 3;
  return Math.round(value) as FeelingValue;
};

export default function HistoryPage() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [monthlyMood, setMonthlyMood] = useState<Record<string, number>>({});
  const [transitionDirection, setTransitionDirection] = useState<MonthTransitionDirection | null>(null);
  const [outgoingMonth, setOutgoingMonth] = useState<MonthSnapshot | null>(null);
  const [confirmState, setConfirmState] = useState<{
    message: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const location = useLocation();

  // If navigated from analysis drill-down, pre-select the incoming date
  const incomingDate = (location.state as { date?: string } | null)?.date;

  const fetchMonthlyMood = useCallback(async () => {
    try {
      const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const data = await apiFetch(`${ANALYSIS_API.monthly}?month=${yearMonth}`);
      const analysis = (data as MonthlyAnalysis) ?? data;
      if (analysis?.dailyTotals) {
        setMonthlyMood(analysis.dailyTotals);
      }
    } catch {
      // Mood display is optional — fail silently
    }
  }, [currentYear, currentMonth, apiFetch]);

  // Fetch monthly mood analysis on mount/month change
  useEffect(() => {
    fetchMonthlyMood();
  }, [fetchMonthlyMood]);

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setDetailLoading(true);
    setDetailError(false);
    try {
      const data = await apiFetch(SCHEDULE_API.byDate(dateStr));
      setSelectedSchedules(data || []);
    } catch {
      setSelectedSchedules([]);
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetryDetail = () => {
    if (selectedDate) handleSelectDate(selectedDate);
  };

  // 默认加载当天日程（或从 analysis drill-down 传入的日期）
  useEffect(() => {
    if (incomingDate) {
      // Parse year/month from incoming date to set calendar context
      const [y, m] = incomingDate.split('-').map(Number);
      if (y && m !== undefined) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
      handleSelectDate(incomingDate);
    } else {
      handleSelectDate(todayStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleComplete = async (id: number) => {
    // 乐观更新
    const flip = (prev: ScheduleItem[]) => prev.map(it =>
      it.id === id ? { ...it, completed: !it.completed } : it
    );
    setSelectedSchedules(flip);
    try {
      await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      if (selectedDate) {
        const data = await apiFetch(SCHEDULE_API.byDate(selectedDate));
        setSelectedSchedules(data || []);
      }
      fetchMonthlyMood(); // refresh calendar mood colors
    } catch (err) {
      setSelectedSchedules(flip);
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      message: '确定要删除这条记录吗？',
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
          setSelectedSchedules(prev => prev.filter(it => it.id !== id));
          fetchMonthlyMood(); // refresh calendar mood colors
        } catch (err) {
          addToast(err instanceof Error ? err.message : '删除失败', 'error');
        }
      },
    });
  };

  const handleUpdate = async (id: number, data: { title: string; description: string; date: string; time: string; feeling: FeelingValue }) => {
    const updateItem = (prev: ScheduleItem[]) => prev.map(it => it.id === id ? { ...it, ...data } : it);
    setSelectedSchedules(updateItem);
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      if (selectedDate) {
        const fresh = await apiFetch(SCHEDULE_API.byDate(selectedDate));
        setSelectedSchedules(fresh || []);
      }
      fetchMonthlyMood(); // refresh calendar mood colors
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
      if (selectedDate) {
        const fresh = await apiFetch(SCHEDULE_API.byDate(selectedDate));
        setSelectedSchedules(fresh || []);
      }
    }
  };

  const isOnToday =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    handleSelectDate(todayStr);
  };

  const handleMonthSelection = (nextYear: number, nextMonth: number) => {
    const currentIndex = currentYear * 12 + currentMonth;
    const nextIndex = nextYear * 12 + nextMonth;
    if (nextIndex === currentIndex) return;

    const direction: MonthTransitionDirection = nextIndex < currentIndex ? 'prev' : 'next';
    setTransitionDirection(direction);
    setOutgoingMonth({
      key: `${currentYear}-${currentMonth}`,
      direction,
      days: generateCalendar(currentYear, currentMonth),
      moods: monthlyMood,
    });
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
  };

  const handlePrevMonth = () => {
    const nextYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    handleMonthSelection(nextYear, nextMonth);
  };

  const handleNextMonth = () => {
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    handleMonthSelection(nextYear, nextMonth);
  };

  const calendarDays = generateCalendar(currentYear, currentMonth);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthGradientStops = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const date = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
    if (!Object.prototype.hasOwnProperty.call(monthlyMood, date)) return null;

    const position = daysInMonth === 1 ? 0 : (idx / (daysInMonth - 1)) * 100;
    const color = FEELING_COLORS[clampFeeling(monthlyMood[date]!)];
    return `${color} ${position.toFixed(2)}%`;
  }).filter((stop): stop is string => Boolean(stop));
  const monthGradient = monthGradientStops.length > 0
    ? `linear-gradient(to right, transparent 0%, ${monthGradientStops.join(', ')}, transparent 100%)`
    : null;

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const pickKaomoji = (total: number): string => {
    if (total > 0) return KAOMOJI[2]!;
    if (total < 0) return KAOMOJI[-2]!;
    return KAOMOJI[0]!;
  };

  const renderCalendarDays = (days: ReturnType<typeof generateCalendar>, moods: Record<string, number>) => (
    <>
      {weekDays.map(d => (
        <div key={d} className="calendar-day-header">{d}</div>
      ))}
      {days.map((day, idx) => {
        const hasMoodEntry = Object.prototype.hasOwnProperty.call(moods, day.fullDate);
        const dayTotal = moods[day.fullDate];
        const hasData = hasMoodEntry && day.isCurrentMonth;
        const moodClass = hasData && dayTotal !== undefined ? `feel${clampFeeling(dayTotal) >= 0 ? '-' : '--'}${Math.abs(clampFeeling(dayTotal))}` : '';
        return (
          <div
            key={idx}
            className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${hasData ? 'has-data' : ''} ${moodClass} ${selectedDate === day.fullDate ? 'selected' : ''}`}
            onClick={() => handleSelectDate(day.fullDate)}
          >
            <span className="day-num">{day.date}</span>
            {hasData && dayTotal !== undefined && (
              <span className="day-kaomoji">{pickKaomoji(dayTotal)}</span>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="history-page">
      <div className="card calendar-card">
        <div className="calendar-header">
          <button className="icon-btn" onClick={handlePrevMonth}>
            <i className="fas fa-chevron-left" />
          </button>
          <div className="calendar-header-selects">
            <select
              className="year-select"
              value={currentYear}
              onChange={e => handleMonthSelection(Number(e.target.value), currentMonth)}
            >
              {Array.from({ length: 21 }, (_, i) => today.getFullYear() - 10 + i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              className="month-select"
              value={currentMonth}
              onChange={e => handleMonthSelection(currentYear, Number(e.target.value))}
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            {!isOnToday && (
              <button className="today-btn" onClick={handleGoToday}>今天</button>
            )}
          </div>
          <button className="icon-btn" onClick={handleNextMonth}>
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        <div className="calendar-transition-shell">
          {outgoingMonth && (
            <div
              key={`out-${outgoingMonth.key}`}
              className={`calendar-grid calendar-grid-layer calendar-grid-exit-${outgoingMonth.direction}`}
              onAnimationEnd={() => setOutgoingMonth(null)}
              aria-hidden="true"
            >
              {renderCalendarDays(outgoingMonth.days, outgoingMonth.moods)}
            </div>
          )}
          <div
            key={`${currentYear}-${currentMonth}`}
            className={`calendar-grid calendar-grid-layer ${transitionDirection ? `calendar-grid-enter-${transitionDirection}` : ''}`}
            onAnimationEnd={() => setTransitionDirection(null)}
          >
            {renderCalendarDays(calendarDays, monthlyMood)}
          </div>
        </div>
        {monthGradient && (
          <div className="monthly-mood-gradient" style={{ background: monthGradient }} />
        )}
      </div>

      {selectedDate && (
        <div className="card detail-card">
          <h2>{selectedDate} 的日程</h2>
          {detailLoading ? (
            <LoadingState label="加载日程..." compact />
          ) : detailError ? (
            <ErrorState
              title="加载失败"
              description="无法获取当天的日程详情，请检查网络后重试。"
              retry={{ label: '重试', onClick: handleRetryDetail }}
              compact
            />
          ) : selectedSchedules.length === 0 ? (
            <EmptyState
              title="暂无日程记录"
              description="这一天还没有安排任何日程。"
              icon="fa-regular fa-calendar-xmark"
              compact
            />
          ) : (
            <div className="schedule-list history-schedule-list" key={selectedDate}>
              {selectedSchedules.map((item, index) => (
                <div
                  className="schedule-entry"
                  key={item.id}
                  style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
                >
                  <ScheduleItemCard
                    item={item}
                    showDate={false}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
