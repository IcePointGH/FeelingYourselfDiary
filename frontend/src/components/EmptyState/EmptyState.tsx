import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <i className={`fas ${icon} ${styles.icon}`} />
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button className={styles.actionBtn} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
