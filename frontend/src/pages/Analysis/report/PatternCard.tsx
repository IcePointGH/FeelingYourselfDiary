import type { ReportPattern, EvidenceSummary } from '../../../types';
import EvidenceView from './EvidenceView';
import './ReportCard.css';

interface PatternCardProps {
  pattern: ReportPattern;
  evidence: EvidenceSummary;
  index: number;
}

export default function PatternCard({ pattern, evidence, index }: PatternCardProps) {
  const scheduleIds = pattern.scheduleIds ?? [];
  const diaryIds = pattern.diaryIds ?? [];
  const hasEvidence = scheduleIds.length > 0 || diaryIds.length > 0;

  return (
    <article className="archive-entry">
      <div className="archive-entry-index" aria-hidden="true">
        <span>Entry</span>
        <b>{String(index + 1).padStart(2, '0')}</b>
      </div>
      <div className="archive-entry-body">
        <h3 className="report-card-item-title">{pattern.title}</h3>
        <p className="report-card-description">{pattern.description}</p>
        {hasEvidence && <EvidenceView scheduleIds={scheduleIds} diaryIds={diaryIds} evidence={evidence} />}
      </div>
    </article>
  );
}
