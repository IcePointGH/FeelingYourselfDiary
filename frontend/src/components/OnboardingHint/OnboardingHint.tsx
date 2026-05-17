import styles from './OnboardingHint.module.css';

type OnboardingHintProps = {
  stepLabel: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function OnboardingHint({ stepLabel, title, description, action }: OnboardingHintProps) {
  return (
    <div className={styles.hint}>
      <span className={styles.stepLabel}>{stepLabel}</span>
      <h4 className={styles.title}>{title}</h4>
      <p className={styles.description}>{description}</p>
      {action && (
        <button className={styles.actionBtn} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
