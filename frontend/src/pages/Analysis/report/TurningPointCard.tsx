import type { ReportTurningPoint, EvidenceSummary } from '../../../types';
import EvidenceView from './EvidenceView';
import './ReportCard.css';

interface TurningPointCardProps {
  point: ReportTurningPoint;
  evidence: EvidenceSummary;
}

const typeLabels: Record<ReportTurningPoint['type'], string> = {
  high: '高点',
  low: '低谷',
  shift: '转折',
  recovery: '恢复',
  unknown: '节点',
};

const typeIcons: Record<ReportTurningPoint['type'], string> = {
  high: 'fa-arrow-up',
  low: 'fa-arrow-down',
  shift: 'fa-route',
  recovery: 'fa-seedling',
  unknown: 'fa-location-dot',
};

export default function TurningPointCard({ point, evidence }: TurningPointCardProps) {
  const scheduleIds = point.scheduleIds ?? [];
  const diaryIds = point.diaryIds ?? [];
  const hasEvidence = scheduleIds.length > 0 || diaryIds.length > 0;

  return (
    <article className={`report-card report-card--turning turning--${point.type}`}>
      <div className="turning-header">
        <span className="turning-date">{point.date}</span>
        <span className="turning-type">
          <i className={`fas ${typeIcons[point.type]}`} aria-hidden="true" />
          {typeLabels[point.type]}
        </span>
      </div>
      <h3 className="report-card-item-title">{point.title}</h3>
      <p className="report-card-description">{point.reason}</p>
      {hasEvidence && (
          <EvidenceView
            scheduleIds={scheduleIds}
            diaryIds={diaryIds}
            evidence={evidence}
          />
      )}
    </article>
  );
}
