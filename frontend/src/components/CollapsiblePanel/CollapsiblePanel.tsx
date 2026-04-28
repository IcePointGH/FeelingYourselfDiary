import { useState } from 'react';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsiblePanel({ title, defaultOpen = false, children }: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-panel">
      <div className="collapsible-panel-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{title}</h3>
        <button
          className="collapsible-toggle-btn"
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          aria-label={isOpen ? '折叠' : '展开'}
        >
          <i className={`fas fa-chevron-down ${isOpen ? 'expanded' : ''}`} />
        </button>
      </div>
      <div className={`collapsible-panel-content${isOpen ? ' expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
}
