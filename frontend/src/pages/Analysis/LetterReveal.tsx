import { useCallback, useState } from 'react';
import './LetterReveal.css';

interface LetterRevealProps {
  reportTitle: string;
  onOpen: () => void;
  onViewDirect: () => void;
}

function getReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function LetterReveal({ reportTitle, onOpen, onViewDirect }: LetterRevealProps) {
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reducedMotion] = useState(getReduceMotion);

  const handleOpen = useCallback(() => {
    if (opening || revealed) return;
    if (reducedMotion) {
      onOpen();
      return;
    }

    setOpening(true);
    window.setTimeout(() => {
      setRevealed(true);
      window.setTimeout(onOpen, 120);
    }, 380);
  }, [opening, revealed, onOpen, reducedMotion]);

  return (
    <div
      className={`letter-reveal ${opening ? 'opening' : ''} ${revealed ? 'revealed' : ''}`}
      role="region"
      aria-label="AI 分析报告"
    >
      <div className="letter-envelope">
        <div className="letter-flap letter-flap-top" />
        <div className="letter-flap letter-flap-left" />
        <div className="letter-flap letter-flap-right" />

        <div className="letter-paper-preview" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="letter-seal" aria-hidden="true">
          <div className="letter-seal-inner">
            <i className="fas fa-feather-alt" />
          </div>
        </div>

        <div className="letter-body">
          <div className="letter-header">
            <span className="letter-kicker">Seven Sense Report</span>
            <h3 className="letter-title">你的情绪报告已经写好</h3>
            <p className="letter-subtitle">{reportTitle}</p>
          </div>

          <div className="letter-actions">
            <button
              className="letter-btn letter-btn-primary"
              onClick={handleOpen}
              disabled={opening || revealed}
              aria-label="拆开报告"
            >
              <i className="fas fa-envelope-open-text" />
              <span>{opening ? '正在拆开' : '拆开报告'}</span>
            </button>
            <button
              className="letter-btn letter-btn-secondary"
              onClick={onViewDirect}
              aria-label="直接查看报告"
            >
              直接查看
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
