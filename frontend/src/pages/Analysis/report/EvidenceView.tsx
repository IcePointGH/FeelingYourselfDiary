import { useState } from 'react';
import type { EvidenceSummary, ScheduleEvidence, DiaryEvidence } from '../../../types';
import './EvidenceView.css';

interface EvidenceViewProps {
  scheduleIds: number[];
  diaryIds: number[];
  evidence: EvidenceSummary;
}

function formatFeeling(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export default function EvidenceView({ scheduleIds, diaryIds, evidence }: EvidenceViewProps) {
  const [expanded, setExpanded] = useState(false);

  const resolvedSchedules: ScheduleEvidence[] = [];
  const missingScheduleIds: number[] = [];

  for (const id of scheduleIds ?? []) {
    const found = (evidence.schedules ?? []).find(item => item.id === id);
    if (found) resolvedSchedules.push(found);
    else missingScheduleIds.push(id);
  }

  const resolvedDiaries: DiaryEvidence[] = [];
  const missingDiaryIds: number[] = [];

  for (const id of diaryIds ?? []) {
    const found = (evidence.diaries ?? []).find(item => item.id === id);
    if (found) resolvedDiaries.push(found);
    else missingDiaryIds.push(id);
  }

  const hasEvidence = resolvedSchedules.length > 0 || resolvedDiaries.length > 0;
  const hasMissing = missingScheduleIds.length > 0 || missingDiaryIds.length > 0;

  if (!hasEvidence && !hasMissing) return null;

  const buttonLabel = expanded ? '收起引用' : '查看引用';

  return (
    <div className="evidence-view">
      <button
        className="evidence-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <i className={`fas fa-chevron-down evidence-chevron ${expanded ? 'expanded' : ''}`} aria-hidden="true" />
        <span>{buttonLabel}</span>
        {hasEvidence && (
          <span className="evidence-count">
            {resolvedSchedules.length + resolvedDiaries.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="evidence-content" role="region" aria-label="引用详情">
          {resolvedSchedules.length > 0 && (
            <div className="evidence-group">
              <h4 className="evidence-group-title">日程记录</h4>
              {resolvedSchedules.map(item => (
                <div key={item.id} className={`evidence-item feel-${item.feeling}`}>
                  <div className="evidence-item-info">
                    <span className="evidence-item-title">{item.title}</span>
                    <span className="evidence-item-date">
                      {item.date}
                      {item.time ? ` ${item.time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                  <span className={`evidence-feeling feel-${item.feeling}`}>
                    {formatFeeling(item.feeling)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {resolvedDiaries.length > 0 && (
            <div className="evidence-group">
              <h4 className="evidence-group-title">日记记录</h4>
              {resolvedDiaries.map(item => (
                <div key={item.id} className="evidence-item evidence-item-diary">
                  <div className="evidence-item-info">
                    <span className="evidence-item-title">{item.title}</span>
                    <span className="evidence-item-date">{item.date}</span>
                  </div>
                  {item.excerpt && <p className="evidence-item-excerpt">{item.excerpt}</p>}
                </div>
              ))}
            </div>
          )}

          {hasMissing && (
            <p className="evidence-missing">
              <i className="fas fa-info-circle" aria-hidden="true" />
              部分引用暂时无法查看
            </p>
          )}
        </div>
      )}
    </div>
  );
}
