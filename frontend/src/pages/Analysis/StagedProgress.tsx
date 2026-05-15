import { useEffect, useRef, useState } from 'react';
import './StagedProgress.css';

const STAGES = [
  { label: '调取记录', detail: '检索日程与日记中的关联条目', icon: 'fa-folder-open' },
  { label: '比对情绪轨迹', detail: '核对趋势、转折与重复出现的感受', icon: 'fa-chart-line' },
  { label: '整理关键发现', detail: '归纳可供查阅的重点线索', icon: 'fa-list-check' },
  { label: '封存这份档案', detail: '将本次分析整理为完整档案', icon: 'fa-box-archive' },
] as const;

const STAGE_INTERVAL = 1600;
const COMPLETE_DELAY = 300;

interface StagedProgressProps {
  isRunning: boolean;
  settling?: boolean;
  onComplete?: () => void;
  /** Timestamp when analysis started (Date.now()).
   *  If provided, the component computes the current stage from elapsed time,
   *  so it survives unmount/remount (e.g., tab switches). */
  startedAt?: number | null;
}

export default function StagedProgress({ isRunning, settling = false, onComplete, startedAt }: StagedProgressProps) {
  const [stageIndex, setStageIndex] = useState(() => {
    if (!isRunning || !startedAt) return 0;
    return Math.min(Math.floor((Date.now() - startedAt) / STAGE_INTERVAL), STAGES.length - 1);
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (completeTimerRef.current !== null) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  };

  useEffect(() => clearAllTimers, []);

  useEffect(() => {
    clearAllTimers();

    if (isRunning) {
      if (settling) {
        setStageIndex(STAGES.length - 1);
        return;
      }
      // If we have a startedAt timestamp, resume from elapsed-time position
      // rather than always starting at 0 (handles remount after tab switch).
      const resumeIndex = startedAt
        ? Math.min(Math.floor((Date.now() - startedAt) / STAGE_INTERVAL), STAGES.length - 1)
        : 0;
      setStageIndex(resumeIndex);
      const advance = (current: number) => {
        const next = Math.min(current + 1, STAGES.length - 1);
        setStageIndex(next);
        if (next < STAGES.length - 1) {
          timerRef.current = setTimeout(() => advance(next), STAGE_INTERVAL);
        }
      };
      if (resumeIndex < STAGES.length - 1) {
        timerRef.current = setTimeout(() => advance(resumeIndex), STAGE_INTERVAL);
      }
      return;
    }

    setStageIndex(STAGES.length - 1);
    completeTimerRef.current = setTimeout(() => onComplete?.(), COMPLETE_DELAY);
  }, [isRunning, settling, onComplete, startedAt]);

  return (
    <div className="staged-progress" role="status" aria-live="polite">
      <div className="staged-progress-header">
        <span className="staged-orbit" aria-hidden="true">
          <span />
        </span>
        <div>
          <p className="staged-kicker">Archive Processing</p>
          <h3>{settling ? '档案已封存，正在递交给你' : '正在处理你的情绪档案'}</h3>
        </div>
      </div>

      <div className="staged-stages">
        {STAGES.map((stage, i) => {
          const state = settling || i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'waiting';
          return (
            <div key={stage.label} className={`staged-item ${state}`}>
              <span className="staged-icon" aria-hidden="true">
                {state === 'done' ? <i className="fas fa-check" /> : <i className={`fas ${stage.icon}`} />}
              </span>
              <span className="staged-copy">
                <span className="staged-label">{stage.label}</span>
                <span className="staged-detail">{stage.detail}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
