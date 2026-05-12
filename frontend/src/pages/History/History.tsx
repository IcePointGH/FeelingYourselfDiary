import { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import ScheduleItemCard from '../../components/ScheduleItemCard/ScheduleItemCard';
import { SCHEDULE_API, ANALYSIS_API } from '../../services/api';
import { KAOMOJI } from '../../utils/feeling';
import type { ScheduleItem, PageResponse, MonthlyAnalysis } from '../../types';
import { generateCalendar } from '../../utils/calendar';
import './History.css';

export default function HistoryPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>([]);
  const [page, setPage] = useState(1);
  const [monthlyMood, setMonthlyMood] = useState<Record<string, number>>({});
  const pageSize = 20;
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // Fetch monthly mood analysis for calendar kaomoji
  useEffect(() => {
    let cancelled = false;
    const fetchMonthlyMood = async () => {
      try {
        const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const data = await apiFetch(`${ANALYSIS_API.monthly}?month=${yearMonth}`);
        const analysis = (data as MonthlyAnalysis) ?? data;
        if (!cancelled && analysis?.dailyTotals) {
          setMonthlyMood(analysis.dailyTotals);
        }
      } catch {
        // Mood display is optional — fail silently
      }
    };
    fetchMonthlyMood();
    return () => { cancelled = true; };
  }, [currentYear, currentMonth, apiFetch]);

  const { data: pageData, loading, error, refetch } = useFetch<PageResponse<ScheduleItem>>(
    () => apiFetch(SCHEDULE_API.list(page, pageSize)),
    [apiFetch, page]
  );

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      const data = await apiFetch(SCHEDULE_API.byDate(dateStr));
      setSelectedSchedules(data || []);
    } catch {
      setSelectedSchedules([]);
      addToast('加载日程详情失败, 请刷新重试', 'error');
    }
  };

  const handleToggleComplete = async (id: number) => {
    // 乐观更新：立即翻转三处数据源
    const flip = (prev: ScheduleItem[]) => prev.map(it =>
      it.id === id ? { ...it, completed: !it.completed } : it
    );
    setOptimisticItems(flip);
    setSelectedSchedules(flip);

    try {
      await apiFetch(SCHEDULE_API.toggleComplete(id), { method: 'PATCH' });
      // 后台静默刷新确保数据一致
      refetch();
      if (selectedDate) {
        const data = await apiFetch(SCHEDULE_API.byDate(selectedDate));
        setSelectedSchedules(data || []);
      }
    } catch (err) {
      // 失败回滚
      setOptimisticItems(flip);
      setSelectedSchedules(flip);
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'DELETE' });
      setOptimisticItems(prev => prev.filter(it => it.id !== id));
      setSelectedSchedules(prev => prev.filter(it => it.id !== id));
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleUpdate = async (id: number, data: { title: string; description: string; date: string; time: string; feeling: number }) => {
    const updateItem = (prev: ScheduleItem[]) => prev.map(it => it.id === id ? { ...it, ...data } : it);
    setOptimisticItems(updateItem);
    setSelectedSchedules(updateItem);
    try {
      await apiFetch(`${SCHEDULE_API.base}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      refetch();
    } catch (err) {
      refetch();
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
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
  const scheduleData = pageData?.content ?? [];
  const [optimisticItems, setOptimisticItems] = useState<ScheduleItem[]>([]);

  // 同步 pageData 到乐观列表
  useEffect(() => {
    if (pageData?.content) setOptimisticItems(pageData.content);
  }, [pageData]);

  const totalPages = pageData?.totalPages ?? 1;

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const datesWithData = new Set(
    optimisticItems
      .filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .map(s => s.date)
  );

  const pickKaomoji = (total: number): string => {
    if (total > 0) return KAOMOJI[2]!;
    if (total < 0) return KAOMOJI[-2]!;
    return KAOMOJI[0]!;
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
          {calendarDays.map((day, idx) => {
            const hasData = datesWithData.has(day.fullDate) && day.isCurrentMonth;
            const dayTotal = monthlyMood[day.fullDate];
            const moodClass = hasData && dayTotal !== undefined ? `feel${dayTotal >= 0 ? '-' : '--'}${Math.abs(dayTotal)}` : '';
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
        </div>
      </div>

      {selectedDate ? (
        <div className="card detail-card">
          <h2>
            {selectedDate} 的日程
            <button className="icon-btn back-btn" onClick={() => setSelectedDate(null)} title="返回列表">
              <i className="fas fa-arrow-left" />
            </button>
          </h2>
          {selectedSchedules.length === 0 ? (
            <p className="empty-text">这一天没有日程记录。</p>
          ) : (
            <div className="schedule-list">
              {selectedSchedules.map(item => (
                <ScheduleItemCard
                  key={item.id}
                  item={item}
                  showDate={false}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card list-card">
          <h2>全部日程</h2>
          {loading && optimisticItems.length === 0 ? (
            <p className="empty-text">加载中...</p>
          ) : optimisticItems.length === 0 ? (
            <p className="empty-text">暂无日程记录。</p>
          ) : (
            <>
              <div className="schedule-list">
                {optimisticItems.map(item => (
                  <ScheduleItemCard
                    key={item.id}
                    item={item}
                    onClick={(clickedItem) => handleSelectDate(clickedItem.date)}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    上一页
                  </button>
                  <span className="pagination-info">第 {page} / {totalPages} 页</span>
                  <button
                    className="btn pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
