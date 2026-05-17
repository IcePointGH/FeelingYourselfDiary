import styles from './PageState.module.css';

export interface PageStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: PageStateAction;
  icon?: string;
  compact?: boolean;
  onboardingHint?: {
    stepLabel: string;
    title: string;
    description: string;
    action?: PageStateAction;
  };
}

export interface ErrorStateProps {
  title: string;
  description: string;
  retry?: PageStateAction;
  compact?: boolean;
}

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  icon = 'fa-regular fa-folder-open',
  compact = false,
  onboardingHint,
}: EmptyStateProps) {
  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {onboardingHint && (
        <div className={styles.onboardingHint}>
          <span className={styles.onboardingStepLabel}>{onboardingHint.stepLabel}</span>
          <h4 className={styles.onboardingTitle}>{onboardingHint.title}</h4>
          <p className={styles.onboardingDesc}>{onboardingHint.description}</p>
          {onboardingHint.action && (
            <button className={styles.onboardingAction} onClick={onboardingHint.action.onClick}>
              {onboardingHint.action.label}
            </button>
          )}
        </div>
      )}
      <i className={`fas ${icon} ${styles.icon}`} />
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {action && (
        <button className={styles.actionBtn} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  retry,
  compact = false,
}: ErrorStateProps) {
  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <i className={`fas fa-exclamation-triangle ${styles.errorIcon}`} />
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {retry && (
        <button className={styles.retryBtn} onClick={retry.onClick}>
          <i className="fas fa-redo" style={{ marginRight: 6 }} />
          {retry.label}
        </button>
      )}
    </div>
  );
}

export function LoadingState({
  label = '加载中...',
  compact = false,
}: LoadingStateProps) {
  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <div className={styles.spinner} />
      {label && <p className={styles.loadingLabel}>{label}</p>}
    </div>
  );
}
