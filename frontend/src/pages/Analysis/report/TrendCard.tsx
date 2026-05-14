import type { ReportTrend } from '../../../types';
import './ReportCard.css';

interface TrendCardProps {
  trend: ReportTrend;
}

const directionMeta: Record<ReportTrend['direction'], { icon: string; label: string }> = {
  up: { icon: 'fa-arrow-trend-up', label: '上行' },
  down: { icon: 'fa-arrow-trend-down', label: '下行' },
  flat: { icon: 'fa-minus', label: '平稳' },
  slightly_up: { icon: 'fa-arrow-up-long', label: '轻微上升' },
  slightly_down: { icon: 'fa-arrow-down-long', label: '轻微下降' },
  mixed: { icon: 'fa-wave-square', label: '波动' },
  unknown: { icon: 'fa-circle-question', label: '待观察' },
};

const volatilityLabels: Record<ReportTrend['volatility'], string> = {
  low: '低波动',
  medium: '中等波动',
  high: '高波动',
  unknown: '波动待观察',
};

export default function TrendCard({ trend }: TrendCardProps) {
  const meta = directionMeta[trend.direction];

  return (
    <article className="report-card report-card--trend">
      <div className="report-card-topline">
        <span className="report-card-section-title">趋势</span>
        <span className="trend-volatility">{volatilityLabels[trend.volatility]}</span>
      </div>
      <div className="trend-direction">
        <span className="trend-icon" aria-hidden="true">
          <i className={`fas ${meta.icon}`} />
        </span>
        <span className="trend-label">{meta.label}</span>
      </div>
      {(trend.highlights ?? []).length > 0 && (
        <ul className="trend-highlights">
          {(trend.highlights ?? []).map((highlight, i) => (
            <li key={`${highlight}-${i}`}>{highlight}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
