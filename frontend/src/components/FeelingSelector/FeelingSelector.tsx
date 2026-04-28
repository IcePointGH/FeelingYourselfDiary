import { useEmotionLabels } from '../../contexts/EmotionLabelsContext';
import { getFeelingClass } from '../../utils/feeling';
import './FeelingSelector.css';

const FEELING_VALUES = [-3, -2, -1, 0, 1, 2, 3] as const;

interface FeelingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function FeelingSelector({ value, onChange, disabled }: FeelingSelectorProps) {
  const { emotionLabels } = useEmotionLabels();

  return (
    <div className="form-group">
      <label>感受值</label>
      <div className="feeling-selector">
        {FEELING_VALUES.map(val => (
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
        ))}
      </div>
      <div className="feeling-label">
        {emotionLabels[String(value)] ?? String(value)}
      </div>
    </div>
  );
}
