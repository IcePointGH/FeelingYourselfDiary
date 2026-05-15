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

export default function TurningPointCard({ point, evidence }: TurningPointCardProps) {
  const scheduleIds = point.scheduleIds ?? [];
  const diaryIds = point.diaryIds ?? [];
  const hasEvidence = scheduleIds.length > 0 || diaryIds.length > 0;

  return (
    <article className={`archive-entry turning--${point.type}`}>
      <div className="archive-entry-index" aria-hidden="true">
        <span>Point</span>
        <b>{point.date}</b>
      </div>
      <div className="archive-entry-body">
        <div className="turning-header">
          <h3 className="report-card-item-title">{point.title}</h3>
          <span className="turning-type">{typeLabels[point.type]}</span>
        </div>
        <p className="report-card-description">{point.reason}</p>
        {hasEvidence && <EvidenceView scheduleIds={scheduleIds} diaryIds={diaryIds} evidence={evidence} />}
      </div>
    </article>
  );
}
