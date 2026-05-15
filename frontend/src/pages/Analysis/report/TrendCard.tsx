import type { ReportTrend } from '../../../types';
import './ReportCard.css';

interface TrendCardProps {
  trend: ReportTrend;
}

const directionMeta: Record<ReportTrend['direction'], { label: string }> = {
  up: { label: '上行' },
  down: { label: '下行' },
  flat: { label: '平稳' },
  slightly_up: { label: '轻微上升' },
  slightly_down: { label: '轻微下降' },
  mixed: { label: '波动' },
  unknown: { label: '待观察' },
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
    <article className="trend-index">
      <div className="section-mark">T</div>
      <div className="trend-copy">
        <div className="report-card-topline">
          <span className="report-card-section-title">趋势索引</span>
          <span className="trend-volatility">{volatilityLabels[trend.volatility]}</span>
        </div>
        <div className="trend-direction">
          <span className="trend-label">{meta.label}</span>
        </div>
        {(trend.highlights ?? []).length > 0 && (
          <ul className="trend-highlights">
            {(trend.highlights ?? []).map((highlight, i) => (
              <li key={`${highlight}-${i}`}>{highlight}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
