import { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

export default function Toast() {
  const { toasts, removeToast } = useToast();
  const [exiting, setExiting] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    toasts.forEach(toast => {
      if (!exiting.has(toast.id)) {
        // Auto-dismiss after 3s: start exit animation at 2.7s, remove at 3s
        const exitTimer = setTimeout(() => {
          setExiting(prev => new Set(prev).add(toast.id));
        }, 2700);

        const removeTimer = setTimeout(() => {
          removeToast(toast.id);
          setExiting(prev => {
            const next = new Set(prev);
            next.delete(toast.id);
            return next;
          });
        }, 3000);

        timers.push(exitTimer, removeTimer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [toasts, exiting, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}${exiting.has(toast.id) ? ' toast--exit' : ''}`}
        >
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
