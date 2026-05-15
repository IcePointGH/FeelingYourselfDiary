import type { ReportOverview } from '../../../types';
import './ReportCard.css';

interface OverviewCardProps {
  overview: ReportOverview;
}

const toneLabels: Record<ReportOverview['tone'], string> = {
  positive: '积极',
  stable: '平稳',
  mixed: '复杂',
  low: '低潮',
  unknown: '待观察',
};

export default function OverviewCard({ overview }: OverviewCardProps) {
  return (
    <article className="overview-archive">
      <div className="overview-mark" aria-hidden="true">
        <span />
      </div>
      <div className="overview-copy">
        <div className="overview-meta">
          <span className="overview-index">Personal Mood Archive</span>
          <span className={`tone-badge tone--${overview.tone}`}>{toneLabels[overview.tone]}</span>
        </div>
        <h3 className="report-card-headline">{overview.headline}</h3>
        <p className="report-card-summary">{overview.summary}</p>
      </div>
      <div className="overview-stamp" aria-hidden="true">
        Reviewed
      </div>
    </article>
  );
}
