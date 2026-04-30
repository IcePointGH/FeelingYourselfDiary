import { useState, useRef, useCallback, useEffect } from 'react';
import {
  KAOMOJI,
  FEELING_VALUES,
  getFeelingClass,
} from '../../utils/feeling';
import type { FeelingValue } from '../../types';
import './FeelingSlider.css';

const MIN = -3;
const MAX = 3;

function valueToPercent(value: number): number {
  return ((value - MIN) / (MAX - MIN)) * 100;
}

function percentToValue(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  const step = (MAX - MIN) / (FEELING_VALUES.length - 1);
  const raw = MIN + (clamped / 100) * (MAX - MIN);
  return Math.round(raw / step) * step;
}

export interface FeelingSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function FeelingSlider({
  value,
  onChange,
  disabled = false,
}: FeelingSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const clampedValue = Math.max(MIN, Math.min(MAX, Math.round(value)));

  // Trigger kaomoji display animation when value changes
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [clampedValue]);

  const getValueFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return clampedValue;
      const rect = track.getBoundingClientRect();
      const percent = ((clientX - rect.left) / rect.width) * 100;
      return percentToValue(percent);
    },
    [clampedValue],
  );

  // ── Track click ──
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const newVal = getValueFromClientX(e.clientX);
      if (newVal !== clampedValue) onChange(newVal);
    },
    [disabled, clampedValue, getValueFromClientX, onChange],
  );

  // ── Thumb drag (mouse) ──
  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      draggingRef.current = true;
      setIsDragging(true);
    },
    [disabled],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const newVal = getValueFromClientX(e.clientX);
      onChange(newVal);
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, getValueFromClientX, onChange]);

  // ── Touch ──
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      draggingRef.current = true;
      setIsDragging(true);
      const touch = e.touches[0];
      const newVal = getValueFromClientX(touch.clientX);
      onChange(newVal);
    },
    [disabled, getValueFromClientX, onChange],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!draggingRef.current || disabled) return;
      const touch = e.touches[0];
      const newVal = getValueFromClientX(touch.clientX);
      onChange(newVal);
    },
    [disabled, getValueFromClientX, onChange],
  );

  const handleTouchEnd = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  // ── Keyboard ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      const idx = FEELING_VALUES.indexOf(clampedValue as FeelingValue);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx > 0) onChange(FEELING_VALUES[idx - 1]);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx < FEELING_VALUES.length - 1) onChange(FEELING_VALUES[idx + 1]);
      }
    },
    [disabled, clampedValue, onChange],
  );

  const trackPercent = valueToPercent(clampedValue);
  const feelingClass = getFeelingClass(clampedValue);

  const wrapperCls = [
    'feeling-slider',
    feelingClass,
    disabled ? 'slider-disabled' : '',
    isDragging ? 'slider-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperCls}>
      {/* Slider track */}
      <div
        className="slider-track-wrap"
        ref={trackRef}
        onClick={handleTrackClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="slider-track-bg">
          {/* Kaomoji markers above the track — same positioning context as thumb */}
          {FEELING_VALUES.map(v => {
            const isActive = v === clampedValue;
            const cls = [
              'kaomoji-marker',
              getFeelingClass(v),
              isActive ? 'marker-active' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={v}
                type="button"
                className={cls}
                style={{ left: `${valueToPercent(v)}%` }}
                onClick={e => {
                  e.stopPropagation();
                  if (!disabled) onChange(v);
                }}
                disabled={disabled}
                tabIndex={-1}
                aria-label={`感受值 ${v}`}
              >
                {KAOMOJI[v]}
              </button>
            );
          })}

          <div
            className="slider-track-fill"
            style={{ width: `${trackPercent}%` }}
          />

          {/* Tick dots on the track */}
          <div className="slider-ticks" aria-hidden="true">
            {FEELING_VALUES.map(v => (
              <span
                key={v}
                className={`slider-tick-dot ${v === clampedValue ? 'tick-active' : ''}`}
              />
            ))}
          </div>

          {/* Thumb */}
          <div
            className="slider-thumb"
            style={{ left: `${trackPercent}%` }}
            onMouseDown={handleThumbMouseDown}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={clampedValue}
            aria-valuetext={KAOMOJI[clampedValue] ?? String(clampedValue)}
            aria-label="感受值"
          />
        </div>
      </div>

      {/* Value label between track and kaomoji display */}
      <div className="slider-value-row">
        <span className="slider-value-num">{`${clampedValue > 0 ? '+' : ''}${clampedValue}`}</span>
      </div>

      {/* Large animated kaomoji display */}
      <div className="slider-kaomoji-stage" key={animKey}>
        <span className="stage-kaomoji">{KAOMOJI[clampedValue]}</span>
      </div>
    </div>
  );
}
