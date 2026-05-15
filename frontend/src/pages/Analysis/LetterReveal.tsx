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
      aria-label="AI 分析档案"
    >
      <div className="archive-sleeve">
        <div className="archive-sheet-preview" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="archive-tab" aria-hidden="true">Archive 014</div>
        <div className="archive-stamp" aria-hidden="true">已阅</div>

        <div className="archive-body">
          <div className="archive-header">
            <span className="archive-kicker">Seven Sense Archive</span>
            <h3 className="archive-title">你的情绪档案已经整理好</h3>
            <p className="archive-subtitle">{reportTitle}</p>
          </div>

          <div className="archive-actions">
            <button
              className="archive-btn archive-btn-primary"
              onClick={handleOpen}
              disabled={opening || revealed}
              aria-label="打开档案"
            >
              <i className="fas fa-folder-open" />
              <span>{opening ? '正在打开' : '打开档案'}</span>
            </button>
            <button
              className="archive-btn archive-btn-secondary"
              onClick={onViewDirect}
              aria-label="直接查看档案"
            >
              直接查看
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
