import { useEffect, useId, useRef } from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    return () => {
      previousActive?.focus();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key !== 'Tab') return;

    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={messageId}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <p id={messageId}>{message}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} className="btn btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={`btn submit-btn${danger ? ' btn-danger-confirm' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
