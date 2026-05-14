import { useEffect, useRef } from 'react';
import type { StructuredReport, EvidenceSummary } from '../../../types';
import OverviewCard from './OverviewCard';
import TrendCard from './TrendCard';
import PatternCard from './PatternCard';
import TurningPointCard from './TurningPointCard';
import SuggestionCard from './SuggestionCard';
import GentleNote from './GentleNote';
import './StructuredReportView.css';

interface StructuredReportViewProps {
  report: StructuredReport;
  evidence: EvidenceSummary;
}

export default function StructuredReportView({ report, evidence }: StructuredReportViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll<HTMLElement>('.sr-card').forEach((card, i) => {
      card.style.setProperty('--sr-delay', `${Math.min(i * 70, 420)}ms`);
      card.classList.add('sr-card--visible');
    });
  }, []);

  const patterns = report.patterns ?? [];
  const turningPoints = report.turningPoints ?? [];
  const suggestions = report.suggestions ?? [];
  const hasPatterns = patterns.length > 0;
  const hasTurningPoints = turningPoints.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="sr-container" ref={containerRef} role="region" aria-label="结构化分析报告">
      <div className="sr-paper">
        <header className="sr-title-row">
          <span className="sr-kicker">Personal Mood Report</span>
          <h2 className="sr-title">{report.title}</h2>
        </header>

        <div className="sr-card sr-card--hero">
          <OverviewCard overview={report.overview} />
        </div>

        <div className="sr-card">
          <TrendCard trend={report.trend} />
        </div>

        {hasPatterns && (
          <section className="sr-section" aria-labelledby="sr-patterns-title">
            <h3 id="sr-patterns-title" className="sr-section-label">发现的模式</h3>
            <div className="sr-section-grid">
              {patterns.map((pattern, i) => (
                <div key={`${pattern.title}-${i}`} className="sr-card">
                  <PatternCard pattern={pattern} evidence={evidence} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        {hasTurningPoints && (
          <section className="sr-section" aria-labelledby="sr-points-title">
            <h3 id="sr-points-title" className="sr-section-label">关键节点</h3>
            <div className="sr-section-grid">
              {turningPoints.map((point, i) => (
                <div key={`${point.date}-${point.title}-${i}`} className="sr-card">
                  <TurningPointCard point={point} evidence={evidence} />
                </div>
              ))}
            </div>
          </section>
        )}

        {hasSuggestions && (
          <section className="sr-section" aria-labelledby="sr-suggestions-title">
            <h3 id="sr-suggestions-title" className="sr-section-label">可以尝试的下一步</h3>
            <div className="sr-section-grid">
              {suggestions.map((suggestion, i) => (
                <div key={`${suggestion.title}-${i}`} className="sr-card">
                  <SuggestionCard suggestion={suggestion} evidence={evidence} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        <GentleNote text={report.gentleNote} />
      </div>
    </div>
  );
}
