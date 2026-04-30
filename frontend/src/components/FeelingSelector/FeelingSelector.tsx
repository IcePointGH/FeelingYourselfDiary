import { lazy, Suspense } from 'react';
import { useEmotionLabels } from '../../contexts/EmotionLabelsContext';
import { getFeelingClass, FEELING_VALUES } from '../../utils/feeling';
import type { FeelingSelectorMode } from '../../types';
import './FeelingSelector.css';

const FeelingSlider = lazy(() => import('../FeelingSlider/FeelingSlider'));

interface FeelingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  mode?: FeelingSelectorMode;
}

export default function FeelingSelector({
  value,
  onChange,
  disabled,
  mode = 'buttons',
}: FeelingSelectorProps) {
  const { emotionLabels } = useEmotionLabels();

  return (
    <div className="form-group">
      <label>感受值</label>

      <div className="feeling-selector">
        {mode === 'slider' ? (
          <Suspense fallback={<div className="slider-fallback" />}>
            <FeelingSlider
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          </Suspense>
        ) : (
          FEELING_VALUES.map(val => (
            <button
              key={val}
              type="button"
              className={`feeling-btn ${getFeelingClass(val)} ${value === val ? 'selected' : ''}`}
              onClick={() => onChange(val)}
              disabled={disabled}
              title={emotionLabels[String(val)] ?? String(val)}
            >
              {val > 0 ? `+${val}` : val}
            </button>
          ))
        )}
      </div>

      <div className="feeling-label">
        {emotionLabels[String(value)] ?? String(value)}
      </div>
    </div>
  );
}
