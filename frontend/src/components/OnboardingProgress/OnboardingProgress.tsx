import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import styles from './OnboardingProgress.module.css';

export default function OnboardingProgress() {
  const {
    state,
    isActive,
    currentStep,
    remainingSteps,
    nextRoute,
    nextActionLabel,
    dismissOnboarding,
    skipOnboarding,
    acknowledgeCompletion,
  } = useOnboarding();

  const navigate = useNavigate();

  if (state.completed && !state.completionAcknowledged) {
    return (
      <div className={styles.completion}>
        <div className={styles.completionInner}>
          <i className={`fas fa-check-circle ${styles.completionIcon}`} />
          <p className={styles.completionText}>你已完成初次体验，继续探索吧！</p>
          <button
            className={styles.completionDismiss}
            onClick={acknowledgeCompletion}
          >
            开始使用
          </button>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  const stepLabels = ['记录日程', '写日记', '查看分析'];

  return (
    <div className={styles.surface}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.welcome}>欢迎来到 Feeling Yourself</span>
          <button
            className={styles.skipBtn}
            onClick={skipOnboarding}
            aria-label="跳过引导"
          >
            稍后再说
          </button>
        </div>
        <p className={styles.explanation}>
          三步体验核心循环：记录 → 反思 → 理解自己
        </p>
        <div className={styles.steps}>
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const done = stepNum < currentStep || (stepNum === currentStep && state.completed);
            const current = stepNum === currentStep;
            return (
              <div
                key={label}
                className={`${styles.step} ${done ? styles.stepDone : ''} ${current ? styles.stepCurrent : ''}`}
              >
                <span className={styles.stepDot}>
                  {done ? <i className="fas fa-check" /> : stepNum}
                </span>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button
            className={styles.cta}
            onClick={() => navigate(nextRoute)}
          >
            {nextActionLabel}
          </button>
          <button
            className={styles.dismissBtn}
            onClick={dismissOnboarding}
          >
            不需要引导
          </button>
        </div>
        <p className={styles.remaining}>
          第 {currentStep} / 3 步 · 还剩 {remainingSteps} 步
        </p>
      </div>
    </div>
  );
}
