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

const toneIcons: Record<ReportOverview['tone'], string> = {
  positive: 'fa-sun',
  stable: 'fa-water',
  mixed: 'fa-cloud-sun',
  low: 'fa-cloud-rain',
  unknown: 'fa-circle-question',
};

export default function OverviewCard({ overview }: OverviewCardProps) {
  return (
    <article className={`report-card report-card--overview tone-surface--${overview.tone}`}>
      <div className="overview-orb" aria-hidden="true">
        <i className={`fas ${toneIcons[overview.tone]}`} />
      </div>
      <div className="overview-copy">
        <span className={`tone-badge tone--${overview.tone}`}>{toneLabels[overview.tone]}</span>
        <h3 className="report-card-headline">{overview.headline}</h3>
        <p className="report-card-summary">{overview.summary}</p>
      </div>
    </article>
  );
}
