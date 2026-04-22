import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { SCHEDULE_API } from '../../services/api';
import type { ScheduleItem } from '../../types';
import './History.css';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
}

function generateCalendar(year: number, month: number): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days: CalendarDay[] = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({
      date: d,
      fullDate: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: d,
      fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({
      date: d,
      fullDate: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  return days;
}

export default function HistoryPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>([]);
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const { apiFetch } = useApi();

  const loadAllSchedules = useCallback(async () => {
    try {
      const data = await apiFetch(SCHEDULE_API.base);
      setAllSchedules(data || []);
    } catch {
      setAllSchedules([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllSchedules();
  }, [loadAllSchedules]);

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      const data = await apiFetch(SCHEDULE_API.byDate(dateStr));
      setSelectedSchedules(data || []);
    } catch {
      setSelectedSchedules([]);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const calendarDays = generateCalendar(currentYear, currentMonth);

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const datesWithData = new Set(
    allSchedules
      .filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .map(s => s.date)
  );

  const getFeelingClass = (val: number) => {
    if (val < 0) return 'negative';
    if (val > 0) return 'positive';
    return 'neutral';
  };

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
              onChange={e => setCurrentYear(Number(e.target.value))}
            >
              {Array.from({ length: 21 }, (_, i) => today.getFullYear() - 10 + i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              className="month-select"
              value={currentMonth}
              onChange={e => setCurrentMonth(Number(e.target.value))}
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>
          <button className="icon-btn" onClick={handleNextMonth}>
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        <div className="calendar-grid">
          {weekDays.map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${datesWithData.has(day.fullDate) ? 'has-data' : ''} ${selectedDate === day.fullDate ? 'selected' : ''}`}
              onClick={() => handleSelectDate(day.fullDate)}
            >
              <span>{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="card detail-card">
          <h2>{selectedDate} 的日程</h2>
          {selectedSchedules.length === 0 ? (
            <p className="empty-text">这一天没有日程记录。</p>
          ) : (
            <div className="schedule-list">
              {selectedSchedules.map(item => (
                <div key={item.id} className="schedule-item">
                  <div className="schedule-info">
                    <div className="schedule-title">{item.title}</div>
                    {item.description && <div className="schedule-desc">{item.description}</div>}
                    <div className="schedule-meta">
                      <span>{item.time}</span>
                      <span className={`feeling-badge ${getFeelingClass(item.feeling)}`}>
                        {item.feeling > 0 ? `+${item.feeling}` : item.feeling}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
