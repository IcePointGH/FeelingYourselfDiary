import { useRef } from 'react';
import './DateInput.css';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  type?: 'date' | 'month' | 'week';
}

function formatDateDisplay(value: string, type: 'date' | 'month' | 'week'): string {
  if (!value) return '';
  if (type === 'month') {
    const [year, month] = value.split('-');
    if (!year || !month) return value;
    return `${year}年${month}月`;
  }
  if (type === 'week') {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    if (match) return `${match[1]}年 第${match[2]}周`;
    return value;
  }
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

export default function DateInput({
  value,
  onChange,
  required,
  placeholder = '选择日期',
  className = '',
  id,
  type = 'date',
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.showPicker?.();
  };

  return (
    <div
      className={`date-input-wrapper ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <span className={`date-input-text ${!value ? 'placeholder' : ''}`}>
        {value ? formatDateDisplay(value, type) : placeholder}
      </span>
      <span className="date-input-icon">
        <i className="fas fa-calendar-alt" />
      </span>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="date-input-native"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
