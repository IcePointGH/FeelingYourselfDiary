import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { FEELING_VALUES, formatFeelingValue, getMoodColor } from '../../utils/feeling';
import type { FeelingValue } from '../../types';
import './FeelingTuner.css';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const MIN = -3;
const MAX = 3;
const STEP_DEGREES = 42;
const SWITCH_SOUND_MIN_INTERVAL = 70;

type BrowserAudioContext = typeof AudioContext;

const getAudioContextConstructor = (): BrowserAudioContext | undefined => {
  return window.AudioContext || window.webkitAudioContext;
};

function clampFeeling(value: number): FeelingValue {
  return Math.max(MIN, Math.min(MAX, Math.round(value))) as FeelingValue;
}

function pointerToDialDegrees(clientX: number, clientY: number, dial: HTMLElement): number {
  const rect = dial.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
  const signedAngle = rawAngle > 180 ? rawAngle - 360 : rawAngle;
  return Math.max(-126, Math.min(126, signedAngle));
}

function getMoodTone(value: number) {
  if (value === 0) return '稳定中频';
  if (value > 0) return '频率变亮';
  return '频率下沉';
}

function createSwitchSoundPlayer() {
  let audioContext: AudioContext | null = null;

  return (value: FeelingValue) => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const now = audioContext.currentTime;
    const sampleCount = Math.floor(audioContext.sampleRate * 0.026);
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.exp(-index / 105);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1500 + (value + 3) * 130;
    bandpass.Q.value = 1.15;

    const clickGain = audioContext.createGain();
    clickGain.gain.setValueAtTime(0.16, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    const reboundOsc = audioContext.createOscillator();
    reboundOsc.type = 'triangle';
    reboundOsc.frequency.setValueAtTime(150 + (value + 3) * 12, now);
    reboundOsc.frequency.exponentialRampToValueAtTime(82 + (value + 3) * 8, now + 0.045);

    const reboundGain = audioContext.createGain();
    reboundGain.gain.setValueAtTime(0.045, now);
    reboundGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);

    noise.connect(bandpass);
    bandpass.connect(clickGain);
    clickGain.connect(audioContext.destination);

    reboundOsc.connect(reboundGain);
    reboundGain.connect(audioContext.destination);

    noise.start(now);
    reboundOsc.start(now);
    noise.stop(now + 0.038);
    reboundOsc.stop(now + 0.056);
  };
}

export interface FeelingTunerProps {
  value: number;
  onChange: Dispatch<number>;
  disabled?: boolean;
}

export default function FeelingTuner({
  value,
  onChange,
  disabled = false,
}: FeelingTunerProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const switchSoundRef = useRef<ReturnType<typeof createSwitchSoundPlayer> | null>(null);
  const lastSoundAtRef = useRef(0);
  const clampedValue = clampFeeling(value);
  const moodColor = getMoodColor(clampedValue);
  const absValue = Math.abs(clampedValue);

  const cssVars = useMemo(
    () => ({
      '--tuner-color': moodColor,
      '--tuner-rotation': `${clampedValue * STEP_DEGREES}deg`,
      '--tuner-wave': `${34 + absValue * 9}px`,
      '--tuner-focus': `${0.3 + absValue * 0.12}`,
    }) as CSSProperties,
    [absValue, clampedValue, moodColor],
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const dial = dialRef.current;
      if (!dial || disabled) return;

      const normalized = pointerToDialDegrees(clientX, clientY, dial);
      const nextValue = clampFeeling(normalized / STEP_DEGREES);

      if (nextValue !== clampedValue) {
        const now = performance.now();
        if (now - lastSoundAtRef.current > SWITCH_SOUND_MIN_INTERVAL) {
          switchSoundRef.current ??= createSwitchSoundPlayer();
          switchSoundRef.current(nextValue);
          lastSoundAtRef.current = now;
        }
        onChange(nextValue);
      }
    },
    [clampedValue, disabled, onChange],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromPointer(event.clientX, event.clientY);
    },
    [disabled, updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateFromPointer(event.clientX, event.clientY);
    },
    [disabled, updateFromPointer],
  );

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const idx = FEELING_VALUES.indexOf(clampedValue);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (idx > 0) {
          const nextValue = FEELING_VALUES[idx - 1];
          switchSoundRef.current ??= createSwitchSoundPlayer();
          switchSoundRef.current(nextValue);
          onChange(nextValue);
        }
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (idx < FEELING_VALUES.length - 1) {
          const nextValue = FEELING_VALUES[idx + 1];
          switchSoundRef.current ??= createSwitchSoundPlayer();
          switchSoundRef.current(nextValue);
          onChange(nextValue);
        }
      }
    },
    [clampedValue, disabled, onChange],
  );

  return (
    <div className={`feeling-tuner ${disabled ? 'feeling-tuner-disabled' : ''}`} style={cssVars}>
      <div className="tuner-readout">
        <span>情绪调音器</span>
        <strong>{formatFeelingValue(clampedValue)}</strong>
      </div>

      <div className="tuner-device-live">
        <div className="tuner-topbar-live">
          <span className="tuner-led-live" />
          <span className="tuner-badge-live">MOOD TUNER</span>
          <span className="tuner-screw-live" />
        </div>

        <div className="tuner-window-live" aria-hidden="true">
          <div className="tuner-wave-live">
            {Array.from({ length: 28 }, (_, index) => (
              <span
                key={index}
                style={
                  {
                    '--bar-phase': (index % 7) + 1,
                    '--bar-offset': `${((index % 5) - 2) * 1.25}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="tuner-scanline-live" />
        </div>

        <div className="tuner-dial-zone-live">
          <div className="tuner-scale-live">
            {FEELING_VALUES.map(option => (
              <button
                key={option}
                type="button"
                className={`tuner-scale-mark-live ${option === clampedValue ? 'active' : ''}`}
                style={
                  {
                    '--mark-angle': `${option * STEP_DEGREES}deg`,
                    '--mark-color': getMoodColor(option),
                  } as CSSProperties
                }
                onClick={() => {
                  if (!disabled) {
                    switchSoundRef.current ??= createSwitchSoundPlayer();
                    switchSoundRef.current(option);
                    onChange(option);
                  }
                }}
                disabled={disabled}
                tabIndex={-1}
                aria-label={`调到 ${formatFeelingValue(option)}`}
              >
                <span>{formatFeelingValue(option)}</span>
              </button>
            ))}
          </div>

          <div
            className="tuner-knob-live"
            ref={dialRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label="情绪调音旋钮"
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={clampedValue}
            aria-valuetext={formatFeelingValue(clampedValue)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown}
          >
            <span className="tuner-knob-face-live" />
            <span className="tuner-needle-live" />
          </div>
        </div>

        <div className="tuner-footer-live">
          <span>{getMoodTone(clampedValue)}</span>
          <b />
        </div>
      </div>
    </div>
  );
}
