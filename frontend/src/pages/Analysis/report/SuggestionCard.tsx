import type { ReportSuggestion, EvidenceSummary } from '../../../types';
import EvidenceView from './EvidenceView';
import './ReportCard.css';

interface SuggestionCardProps {
  suggestion: ReportSuggestion;
  evidence: EvidenceSummary;
  index: number;
}

const difficultyLabels: Record<ReportSuggestion['difficulty'], string> = {
  easy: '轻松',
  medium: '适中',
  hard: '需要投入',
  unknown: '待定',
};

export default function SuggestionCard({ suggestion, evidence, index }: SuggestionCardProps) {
  const scheduleIds = suggestion.scheduleIds ?? [];
  const diaryIds = suggestion.diaryIds ?? [];
  const hasEvidence = scheduleIds.length > 0 || diaryIds.length > 0;

  return (
    <article className="archive-entry archive-entry--suggestion">
      <div className="archive-entry-index" aria-hidden="true">
        <span>Action</span>
        <b>{String(index + 1).padStart(2, '0')}</b>
      </div>
      <div className="archive-entry-body">
        <div className="suggestion-header">
          <h3 className="report-card-item-title">{suggestion.title}</h3>
          <span className={`diff-badge diff--${suggestion.difficulty}`}>
            {difficultyLabels[suggestion.difficulty]}
          </span>
        </div>
        <p className="report-card-description">{suggestion.action}</p>
        {hasEvidence && <EvidenceView scheduleIds={scheduleIds} diaryIds={diaryIds} evidence={evidence} />}
      </div>
    </article>
  );
}
