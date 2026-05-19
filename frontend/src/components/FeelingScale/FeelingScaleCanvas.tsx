import { Application, Container, Graphics } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { buildDailyBalanceState } from '../../utils/dailyBalance';
import { MOOD_COLORS } from '../../utils/feeling';

type FeelingScaleCanvasProps = {
  value: number;
};

const WIDTH = 420;
const HEIGHT = 230;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 104;

function hexToNumber(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function redrawWeight(graphic: Graphics, value: number, side: 'left' | 'right') {
  graphic.clear();
  if (value === 0) return;
  const magnitude = Math.abs(value);
  const width = 28 + magnitude * 7;
  const height = 16 + magnitude * 2;
  graphic
    .roundRect(-width / 2, -height, width, height, height / 2)
    .fill({ color: hexToNumber(MOOD_COLORS[value]), alpha: 0.96 });
  graphic.x = 0;
}

export default function FeelingScaleCanvas({ value }: FeelingScaleCanvasProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(value);

  useEffect(() => {
    targetRef.current = value;
  }, [value]);

  useEffect(() => {
    let disposed = false;
    let initialized = false;
    let app: Application | null = null;

    const mount = async () => {
      if (!hostRef.current) return;

      app = new Application();
      await app.init({
        width: WIDTH,
        height: HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      initialized = true;

      if (disposed || !hostRef.current) {
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        return;
      }

      hostRef.current.appendChild(app.canvas);

      const root = new Container();
      app.stage.addChild(root);

      const palette = isDark
        ? {
            halo: 0xd7c3a5,
            haloAlpha: 0.1,
            shadow: 0x181715,
            shadowAlpha: 0.18,
            base: 0x8d806f,
            baseAlpha: 0.64,
            baseTop: 0xc3b49d,
            baseTopAlpha: 0.72,
            wood: 0x9a7650,
            woodAlpha: 0.78,
            cord: 0xa9967c,
            cordAlpha: 0.62,
            leftPan: 0x92a2af,
            rightPan: 0xc7975a,
            pivotGlowAlpha: 0.12,
          }
        : {
            halo: 0xf5e5cc,
            haloAlpha: 0.18,
            shadow: 0x7f756a,
            shadowAlpha: 0.12,
            base: 0xd9c9b1,
            baseAlpha: 0.94,
            baseTop: 0xf0e5d4,
            baseTopAlpha: 0.96,
            wood: 0x927254,
            woodAlpha: 0.98,
            cord: 0xbca78a,
            cordAlpha: 0.92,
            leftPan: 0x8f9ba7,
            rightPan: 0xd9a45d,
            pivotGlowAlpha: 0.24,
          };

      const halo = new Graphics()
        .ellipse(CENTER_X, CENTER_Y + 12, 148, 92)
        .fill({ color: palette.halo, alpha: palette.haloAlpha });
      const shadow = new Graphics()
        .ellipse(CENTER_X, CENTER_Y + 102, 116, 16)
        .fill({ color: palette.shadow, alpha: palette.shadowAlpha });
      root.addChild(halo, shadow);

      const base = new Graphics()
        .roundRect(CENTER_X - 94, CENTER_Y + 72, 188, 20, 10)
        .fill({ color: palette.base, alpha: palette.baseAlpha })
        .roundRect(CENTER_X - 58, CENTER_Y + 52, 116, 24, 12)
        .fill({ color: palette.baseTop, alpha: palette.baseTopAlpha });
      root.addChild(base);

      const stand = new Graphics()
        .roundRect(CENTER_X - 10, CENTER_Y - 4, 20, 74, 10)
        .fill({ color: palette.wood, alpha: palette.woodAlpha });
      root.addChild(stand);

      const pivotGlow = new Graphics()
        .circle(CENTER_X, CENTER_Y - 8, 18)
        .fill({ color: palette.halo, alpha: palette.pivotGlowAlpha });
      const pivot = new Graphics()
        .circle(CENTER_X, CENTER_Y - 8, 9)
        .fill({ color: palette.wood, alpha: isDark ? 0.9 : 1 });
      root.addChild(pivotGlow, pivot);

      const beamGroup = new Container();
      beamGroup.x = CENTER_X;
      beamGroup.y = CENTER_Y - 8;
      root.addChild(beamGroup);

      const beam = new Graphics()
        .roundRect(-122, -4, 244, 8, 4)
        .fill({ color: palette.wood, alpha: palette.woodAlpha });
      beamGroup.addChild(beam);

      const leftRig = new Container();
      leftRig.x = -88;
      const rightRig = new Container();
      rightRig.x = 88;
      beamGroup.addChild(leftRig, rightRig);

      const leftCord = new Graphics()
        .moveTo(0, 0)
        .lineTo(0, 48)
        .stroke({ color: palette.cord, width: 2, alpha: palette.cordAlpha });
      const rightCord = new Graphics()
        .moveTo(0, 0)
        .lineTo(0, 48)
        .stroke({ color: palette.cord, width: 2, alpha: palette.cordAlpha });
      leftRig.addChild(leftCord);
      rightRig.addChild(rightCord);

      const leftPan = new Graphics()
        .moveTo(-38, 48)
        .lineTo(38, 48)
        .stroke({ color: palette.leftPan, width: 3, alpha: isDark ? 0.82 : 1 });
      const rightPan = new Graphics()
        .moveTo(-38, 48)
        .lineTo(38, 48)
        .stroke({ color: palette.rightPan, width: 3, alpha: isDark ? 0.82 : 1 });
      leftRig.addChild(leftPan);
      rightRig.addChild(rightPan);

      const leftWeight = new Graphics();
      const rightWeight = new Graphics();
      leftRig.addChild(leftWeight);
      rightRig.addChild(rightWeight);

      const zeroOrbGlow = new Graphics()
        .circle(CENTER_X, CENTER_Y - 8, 16)
        .fill({ color: hexToNumber(MOOD_COLORS[0]), alpha: value === 0 ? (isDark ? 0.1 : 0.18) : 0 });
      const zeroOrb = new Graphics()
        .circle(CENTER_X, CENTER_Y - 8, 9)
        .fill({ color: hexToNumber(MOOD_COLORS[0]), alpha: value === 0 ? (isDark ? 0.86 : 1) : 0 });
      root.addChild(zeroOrbGlow);
      root.addChild(zeroOrb);

      let currentTilt = 0;
      let currentValue = value;
      let leftDrop = 0;
      let rightDrop = 0;
      let zeroAlpha = value === 0 ? 1 : 0;

      redrawWeight(leftWeight, value < 0 ? value : 0, 'left');
      redrawWeight(rightWeight, value > 0 ? value : 0, 'right');

      app.ticker.add(ticker => {
        const targetValue = targetRef.current;
        const targetModel = buildDailyBalanceState(targetValue);

        if (targetValue !== currentValue) {
          currentValue = targetValue;
          redrawWeight(leftWeight, targetValue < 0 ? targetValue : 0, 'left');
          redrawWeight(rightWeight, targetValue > 0 ? targetValue : 0, 'right');
          leftDrop = targetValue < 0 ? -18 : 0;
          rightDrop = targetValue > 0 ? -18 : 0;
        }

        const easing = 1 - Math.pow(0.0008, ticker.deltaMS / 1000);
        currentTilt += (targetModel.tilt - currentTilt) * easing;
        leftDrop += (0 - leftDrop) * easing;
        rightDrop += (0 - rightDrop) * easing;
        zeroAlpha += ((targetValue === 0 ? 1 : 0) - zeroAlpha) * easing;

        beamGroup.rotation = currentTilt;
        leftRig.rotation = -currentTilt;
        rightRig.rotation = -currentTilt;

        leftWeight.y = 48 + leftDrop;
        rightWeight.y = 48 + rightDrop;
        zeroOrb.alpha = zeroAlpha * (isDark ? 0.86 : 1);
        zeroOrbGlow.alpha = zeroAlpha * (isDark ? 0.1 : 0.18);
        zeroOrb.scale.set(0.82 + zeroAlpha * 0.18);
        zeroOrbGlow.scale.set(0.9 + zeroAlpha * 0.1);
        pivotGlow.alpha = (isDark ? 0.1 : 0.18) + zeroAlpha * (isDark ? 0.08 : 0.12);
        shadow.scale.x = 1 + Math.abs(currentTilt) * 0.18;
      });
    };

    void mount();

    return () => {
      disposed = true;
      if (!initialized) return;
      app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    };
  }, [isDark]);

  return <div ref={hostRef} className="feeling-scale-canvas" aria-hidden="true" />;
}
