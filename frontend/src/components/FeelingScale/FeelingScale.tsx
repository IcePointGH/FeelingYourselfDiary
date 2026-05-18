import type { CSSProperties } from 'react';
import { FEELING_VALUES, formatFeelingValue, getMoodColor } from '../../utils/feeling';
import FeelingScaleCanvas from './FeelingScaleCanvas';
import './FeelingScale.css';

type FeelingScaleProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export default function FeelingScale({ value, onChange, disabled }: FeelingScaleProps) {
  return (
    <div className="feeling-scale">
      <FeelingScaleCanvas value={value} />

      <div className="feeling-scale-options" role="group" aria-label="选择感受值">
        {FEELING_VALUES.map(option => (
          <button
            key={option}
            type="button"
            className={option === value ? 'active' : ''}
            onClick={() => onChange(option)}
            disabled={disabled}
            style={{ '--option-color': getMoodColor(option) } as CSSProperties}
          >
            {formatFeelingValue(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
