import {
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FEELING_VALUES, KAOMOJI, formatFeelingValue, getMoodColor } from '../../utils/feeling';
import './FeelingPrototype.css';

type Variant = 'tuner' | 'balloon' | 'balance';

const variantLabels: Record<Variant, string> = {
  tuner: '情绪调音器',
  balloon: '浮力实验',
  balance: '情绪天平',
};

const moodLabels: Record<number, string> = {
  '-3': '沉重',
  '-2': '低落',
  '-1': '有点累',
  '0': '平衡',
  '1': '轻快',
  '2': '明亮',
  '3': '高扬',
};

function range(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

function getVariant(searchValue: string | null): Variant {
  if (searchValue === 'tuner') return 'tuner';
  if (searchValue === 'balance') return 'balance';
  if (searchValue === 'balloon') return 'balloon';
  return 'tuner';
}

function pointerToDialDegrees(clientX: number, clientY: number, dial: HTMLElement): number {
  const rect = dial.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
  const signedAngle = rawAngle > 180 ? rawAngle - 360 : rawAngle;
  return Math.max(-126, Math.min(126, signedAngle));
}

export default function FeelingPrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = getVariant(searchParams.get('variant'));
  const [value, setValue] = useState(0);

  const positiveCount = Math.max(0, value);
  const negativeCount = Math.max(0, -value);
  const moodColor = getMoodColor(value);

  const physicsStyle = useMemo(
    () => ({
      '--mood-color': moodColor,
      '--float-y': `${value * -18}px`,
      '--tilt': `${value * 7}deg`,
      '--balance-tilt': `${value * 8}deg`,
      '--balance-counter-tilt': `${value * -8}deg`,
      '--balance-left-drop': `${Math.max(0, -value) * 10}px`,
      '--balance-right-drop': `${Math.max(0, value) * 10}px`,
      '--balance-shadow-shift': `${value * 12}px`,
      '--balance-negative-force': `${Math.max(0.12, negativeCount / 3)}`,
      '--balance-positive-force': `${Math.max(0.12, positiveCount / 3)}`,
      '--beam-shift': `${value * 9}px`,
      '--pig-scale': `${1 + negativeCount * 0.08}`,
      '--basket-weight': `${negativeCount}`,
      '--balloon-lift': `${positiveCount}`,
      '--tuner-rotation': `${value * 42}deg`,
      '--tuner-wave': `${36 + Math.abs(value) * 10}px`,
      '--tuner-focus': `${0.32 + Math.abs(value) * 0.12}`,
      '--tuner-noise': `${Math.max(0.1, (3 - Math.abs(value)) / 3)}`,
    }) as CSSProperties,
    [moodColor, negativeCount, positiveCount, value],
  );

  const setVariant = (next: Variant) => {
    setSearchParams({ variant: next });
  };

  return (
    <main className="feeling-prototype-page">
      <header className="prototype-header">
        <div>
          <span className="prototype-kicker">Prototype / throwaway</span>
          <h1>仿真物理情绪选择器</h1>
          <p>
            用可视化的重量、浮力和倾斜反馈表达 -3 到 +3。这个页面只用于体验方向，不接入生产数据。
          </p>
        </div>
        <Link className="prototype-back-link" to="/schedule">
          返回日程
        </Link>
      </header>

      <section className="prototype-shell" style={physicsStyle}>
        <div className="prototype-stage-card">
          {variant === 'tuner' ? (
            <TunerVariant value={value} positiveCount={positiveCount} negativeCount={negativeCount} onChange={setValue} />
          ) : variant === 'balloon' ? (
            <BalloonVariant value={value} positiveCount={positiveCount} negativeCount={negativeCount} />
          ) : (
            <BalanceVariant value={value} positiveCount={positiveCount} negativeCount={negativeCount} onChange={setValue} />
          )}
        </div>

        <aside className="prototype-control-panel">
          <div className="prototype-readout">
            <span className="readout-label">当前感受</span>
            <strong>{formatFeelingValue(value)}</strong>
            <em>{moodLabels[value]}</em>
            <span className="readout-kaomoji">{KAOMOJI[value]}</span>
          </div>

          <div className="prototype-value-grid" aria-label="选择情绪值">
            {FEELING_VALUES.map(option => (
              <button
                key={option}
                type="button"
                className={`prototype-value-btn ${value === option ? 'active' : ''}`}
                style={{ '--button-color': getMoodColor(option) } as CSSProperties}
                onClick={() => setValue(option)}
                aria-pressed={value === option}
              >
                <span>{formatFeelingValue(option)}</span>
                <small>{moodLabels[option]}</small>
              </button>
            ))}
          </div>

          <div className="prototype-state">
            <span>state</span>
            <code>{JSON.stringify({ variant, value, positiveCount, negativeCount })}</code>
          </div>
        </aside>
      </section>

      <nav className="prototype-switcher" aria-label="原型方案切换">
        {(Object.keys(variantLabels) as Variant[]).map(item => (
          <button
            key={item}
            type="button"
            className={variant === item ? 'active' : ''}
            onClick={() => setVariant(item)}
          >
            {variantLabels[item]}
          </button>
        ))}
      </nav>
    </main>
  );
}

interface VariantProps {
  value: number;
  positiveCount: number;
  negativeCount: number;
  onChange?: Dispatch<number>;
}

function TunerVariant({ value, onChange }: VariantProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const clampedValue = Math.max(-3, Math.min(3, value));
  const rotation = clampedValue * 42;
  const descriptor = clampedValue === 0 ? '稳定中频' : clampedValue > 0 ? '频率变亮' : '频率变低';

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const dial = dialRef.current;
      if (!dial || !onChange) return;

      const normalized = pointerToDialDegrees(clientX, clientY, dial);
      onChange(Math.round(normalized / 42));
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!onChange) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        onChange(Math.max(-3, value - 1));
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        onChange(Math.min(3, value + 1));
      }
    },
    [onChange, value],
  );

  return (
    <div className="tuner-prototype" aria-label="情绪调音器原型">
      <div className="tuner-workbench">
        <div className="tuner-device">
          <div className="tuner-topbar">
            <span className="tuner-led" />
            <span className="tuner-badge">MOOD TUNER</span>
            <span className="tuner-screw" />
          </div>

          <div className="tuner-window" aria-hidden="true">
            <div className="tuner-wave">
              {range(34).map(index => (
                <span
                  key={index}
                  style={
                    {
                      '--bar-phase': (index % 7) + 1,
                      '--bar-offset': `${((index % 5) - 2) * 1.5}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="tuner-scanline" />
          </div>

          <div className="tuner-dial-zone">
            <div className="tuner-scale" aria-hidden="true">
              {FEELING_VALUES.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`tuner-scale-mark ${option === value ? 'active' : ''}`}
                  style={
                    {
                      '--mark-angle': `${option * 42}deg`,
                      '--mark-color': getMoodColor(option),
                    } as CSSProperties
                  }
                  onClick={() => onChange?.(option)}
                  aria-label={`调到 ${formatFeelingValue(option)}`}
                >
                  <span>{formatFeelingValue(option)}</span>
                </button>
              ))}
            </div>

            <div
              className="tuner-knob"
              ref={dialRef}
              role="slider"
              tabIndex={0}
              aria-label="情绪调音旋钮"
              aria-valuemin={-3}
              aria-valuemax={3}
              aria-valuenow={value}
              aria-valuetext={formatFeelingValue(value)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onKeyDown={handleKeyDown}
              style={{ '--knob-rotation': `${rotation}deg` } as CSSProperties}
            >
              <span className="tuner-knob-face" />
              <span className="tuner-needle" />
            </div>
          </div>

          <div className="tuner-footer">
            <span>{descriptor}</span>
            <strong>{formatFeelingValue(value)}</strong>
          </div>
        </div>
      </div>

      <div className="physics-caption">
        <h2>{value === 0 ? '把今天调回中频' : value > 0 ? '频率更亮，波形更轻' : '频率下沉，波形变厚'}</h2>
        <p>拖动旋钮时，指针、光带、波形和阴影一起变化；数值被做成可触摸的“调频”过程，而不是普通打分。</p>
      </div>
    </div>
  );
}

function BalloonVariant({ value, positiveCount, negativeCount }: VariantProps) {
  const balloons = Math.max(1, positiveCount + 1);
  const weights = Math.max(1, negativeCount + 1);

  return (
    <div className="balloon-prototype" aria-label="气球浮力原型">
      <div className="balloon-sky">
        <div className="balloon-cluster" aria-hidden="true">
          {range(balloons).map(index => (
            <span
              className="balloon-orb"
              key={index}
              style={{
                '--delay': `${index * 80}ms`,
                '--x': `${(index - balloons / 2) * 18}px`,
                '--y': `${18 + index * 2}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        <div className="balloon-strings" aria-hidden="true">
          {range(balloons).map(index => (
            <span key={index} style={{ '--x': `${(index - balloons / 2) * 18}px` } as CSSProperties} />
          ))}
        </div>

        <div className="floating-basket">
          <div className="pig-face" aria-hidden="true">
            <span className="pig-ear left" />
            <span className="pig-ear right" />
            <span className="pig-eye left" />
            <span className="pig-eye right" />
            <span className="pig-nose" />
          </div>
          <div className="weight-stack" aria-hidden="true">
            {range(weights).map(index => (
              <span key={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="physics-caption">
        <h2>{value >= 0 ? '气球变多，身体变轻' : '重量增加，慢慢下沉'}</h2>
        <p>正值增加浮力，负值增加重量；中性时停在中间，适合作为日程表单里的主交互。</p>
      </div>
    </div>
  );
}

function BalanceVariant({ value, positiveCount, negativeCount, onChange }: VariantProps) {
  const leftBlocks = Math.max(0, negativeCount);
  const rightBlocks = Math.max(0, positiveCount);
  const leftMarker = negativeCount > 0 ? '更重' : '轻';
  const rightMarker = positiveCount > 0 ? '更重' : '轻';
  const nextLeft = Math.max(-3, value - 1);
  const nextRight = Math.min(3, value + 1);

  return (
    <div className="balance-prototype" aria-label="情绪天平原型">
      <div className="balance-stage">
        <div className="balance-ambient-field" aria-hidden="true" />
        <div className="balance-force-rail" aria-hidden="true">
          <span className="negative" />
          <b />
          <span className="positive" />
        </div>

        <div className="balance-machine">
          <div className="balance-beam">
            <button
              type="button"
              className="balance-pan left"
              onClick={() => onChange?.(nextLeft)}
              aria-label="增加左侧消耗重量"
            >
              <span className="pan-hanger" />
              <span className="pan-chain chain-left" />
              <span className="pan-chain chain-center" />
              <span className="pan-chain chain-right" />
              <span className="pan-bowl" />
              <span className="pan-label">消耗</span>
              <span className="pan-marker">{leftMarker}</span>
              <span className="pan-blocks">
                {leftBlocks === 0 ? (
                  <span className="pan-empty" />
                ) : (
                  range(leftBlocks).map(index => (
                    <span key={index} className="weight-cube" style={{ '--cube-index': index } as CSSProperties} />
                  ))
                )}
              </span>
            </button>
            <button
              type="button"
              className="balance-pan right"
              onClick={() => onChange?.(nextRight)}
              aria-label="增加右侧支撑重量"
            >
              <span className="pan-hanger" />
              <span className="pan-chain chain-left" />
              <span className="pan-chain chain-center" />
              <span className="pan-chain chain-right" />
              <span className="pan-bowl" />
              <span className="pan-label">支撑</span>
              <span className="pan-marker">{rightMarker}</span>
              <span className="pan-blocks">
                {rightBlocks === 0 ? (
                  <span className="pan-empty" />
                ) : (
                  range(rightBlocks).map(index => (
                    <span key={index} className="weight-cube" style={{ '--cube-index': index } as CSSProperties} />
                  ))
                )}
              </span>
            </button>
          </div>
          <div className="balance-center-cap">
            <span />
          </div>
          <div className="balance-pivot" />
          <div className="balance-base" />
          <div className="balance-shadow" aria-hidden="true" />
        </div>
      </div>

      <div className="physics-caption">
        <h2>{value === 0 ? '两侧保持平衡' : value > 0 ? '支撑侧把梁压低' : '消耗侧把梁压低'}</h2>
        <p>点击左右托盘就像往对应一侧加砝码；梁体倾斜、托盘下沉、底座阴影和砝码数量共同表达当前情绪值。</p>
      </div>
    </div>
  );
}
