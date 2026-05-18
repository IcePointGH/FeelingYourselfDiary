import { Application, Container, Graphics } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { buildDailyBalanceState } from '../../utils/dailyBalance';
import { MOOD_COLORS } from '../../utils/feeling';

type BalanceScaleCanvasProps = {
  total: number;
  positiveValues: number[];
  negativeValues: number[];
};

const WIDTH = 440;
const HEIGHT = 220;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 98;

function hexToNumber(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function addWeights(container: Container, values: number[]) {
  container.removeChildren();
  const visualValues =
    values.length > 3
      ? [values[0] > 0 ? 3 : -3, values[0] > 0 ? 3 : -3, values[0] > 0 ? 3 : -3]
      : values;

  visualValues.forEach((value, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const width = 20 + Math.abs(value) * 5;
    const weight = new Graphics()
      .roundRect(-42 + col * 30, 18 - row * 18, width, 14, 7)
      .fill({ color: hexToNumber(MOOD_COLORS[value]), alpha: 0.9 });
    container.addChild(weight);
  });
}

export default function BalanceScaleCanvas({ total, positiveValues, negativeValues }: BalanceScaleCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(buildDailyBalanceState(total));
  const weightsRef = useRef({ positiveValues, negativeValues });

  useEffect(() => {
    targetRef.current = buildDailyBalanceState(total);
    weightsRef.current = { positiveValues, negativeValues };
  }, [negativeValues, positiveValues, total]);

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

      const baseShadow = new Graphics()
        .ellipse(CENTER_X, CENTER_Y + 92, 104, 14)
        .fill({ color: 0x8d7358, alpha: 0.11 });
      root.addChild(baseShadow);

      const plinth = new Graphics()
        .roundRect(CENTER_X - 94, CENTER_Y + 68, 188, 20, 10)
        .fill({ color: 0xd9c9b1, alpha: 0.92 })
        .roundRect(CENTER_X - 58, CENTER_Y + 48, 116, 22, 10)
        .fill({ color: 0xf0e5d4, alpha: 0.96 });
      root.addChild(plinth);

      const stand = new Graphics()
        .roundRect(CENTER_X - 10, CENTER_Y - 8, 20, 76, 10)
        .fill({ color: 0x927254, alpha: 0.96 });
      root.addChild(stand);

      const pivotGlow = new Graphics()
        .circle(CENTER_X, CENTER_Y - 12, 15)
        .fill({ color: 0xf3dfbc, alpha: 0.2 });
      const pivot = new Graphics()
        .circle(CENTER_X, CENTER_Y - 12, 8)
        .fill({ color: 0x927254, alpha: 1 });
      root.addChild(pivotGlow, pivot);

      const accentLayer = new Container();
      root.addChildAt(accentLayer, 0);

      const weatherLayer = new Container();
      accentLayer.addChild(weatherLayer);

      const leftWash = new Graphics()
        .roundRect(18, 14, 126, 164, 22)
        .fill({ color: hexToNumber(MOOD_COLORS[-2]), alpha: 0.08 });
      const rightWash = new Graphics()
        .roundRect(WIDTH - 144, 14, 126, 164, 22)
        .fill({ color: hexToNumber(MOOD_COLORS[2]), alpha: 0.1 });
      weatherLayer.addChild(leftWash, rightWash);


      const beamGroup = new Container();
      beamGroup.x = CENTER_X;
      beamGroup.y = CENTER_Y - 12;
      root.addChild(beamGroup);

      const beam = new Graphics()
        .roundRect(-116, -4, 232, 8, 4)
        .fill({ color: 0x9d7b57, alpha: 1 });
      beamGroup.addChild(beam);

      const leftRig = new Container();
      leftRig.x = -88;
      const rightRig = new Container();
      rightRig.x = 88;
      beamGroup.addChild(leftRig, rightRig);

      const leftCord = new Graphics()
        .moveTo(0, 0)
        .lineTo(0, 46)
        .stroke({ color: 0xbca78a, width: 2, alpha: 0.92 });
      const rightCord = new Graphics()
        .moveTo(0, 0)
        .lineTo(0, 46)
        .stroke({ color: 0xbca78a, width: 2, alpha: 0.92 });
      leftRig.addChild(leftCord);
      rightRig.addChild(rightCord);

      const leftPan = new Graphics()
        .moveTo(-36, 46)
        .lineTo(36, 46)
        .stroke({ color: 0x8f9ba7, width: 3, alpha: 1 });
      const rightPan = new Graphics()
        .moveTo(-36, 46)
        .lineTo(36, 46)
        .stroke({ color: 0xd9a45d, width: 3, alpha: 1 });
      leftRig.addChild(leftPan);
      rightRig.addChild(rightPan);

      const leftWeights = new Container();
      leftWeights.y = 24;
      const rightWeights = new Container();
      rightWeights.y = 24;
      leftRig.addChild(leftWeights);
      rightRig.addChild(rightWeights);
      addWeights(leftWeights, negativeValues);
      addWeights(rightWeights, positiveValues);

      const leftShadow = new Graphics()
        .ellipse(0, 0, 44, 10)
        .fill({ color: 0x7f756a, alpha: 0.08 });
      const rightShadow = new Graphics()
        .ellipse(0, 0, 44, 10)
        .fill({ color: 0x7f756a, alpha: 0.08 });
      root.addChild(leftShadow, rightShadow);

      let currentTilt = 0;
      let previousPositiveKey = positiveValues.join(',');
      let previousNegativeKey = negativeValues.join(',');

      app.ticker.add(ticker => {
        const target = targetRef.current;
        const latestWeights = weightsRef.current;

        const nextNegativeKey = latestWeights.negativeValues.join(',');
        const nextPositiveKey = latestWeights.positiveValues.join(',');

        if (nextNegativeKey !== previousNegativeKey) {
          addWeights(leftWeights, latestWeights.negativeValues);
          previousNegativeKey = nextNegativeKey;
        }

        if (nextPositiveKey !== previousPositiveKey) {
          addWeights(rightWeights, latestWeights.positiveValues);
          previousPositiveKey = nextPositiveKey;
        }

        const easing = 1 - Math.pow(0.0008, ticker.deltaMS / 1000);
        currentTilt += (target.tilt - currentTilt) * easing;

        beamGroup.rotation = currentTilt;
        leftRig.rotation = -currentTilt;
        rightRig.rotation = -currentTilt;

        const sin = Math.sin(currentTilt);
        const cos = Math.cos(currentTilt);
        const leftPanX = CENTER_X - 88 * cos;
        const leftPanY = CENTER_Y - 12 - 88 * sin + 46;
        const rightPanX = CENTER_X + 88 * cos;
        const rightPanY = CENTER_Y - 12 + 88 * sin + 46;

        leftShadow.position.set(leftPanX, leftPanY + 26);
        rightShadow.position.set(rightPanX, rightPanY + 26);
        leftShadow.alpha = 0.05 + Math.max(0, leftPanY - rightPanY) * 0.0016;
        rightShadow.alpha = 0.05 + Math.max(0, rightPanY - leftPanY) * 0.0016;
        baseShadow.scale.x = 1 + Math.abs(currentTilt) * 0.18;

        leftWash.alpha = 0.06 + Math.max(0, -target.clamped) * 0.026;
        rightWash.alpha = 0.06 + Math.max(0, target.clamped) * 0.026;
        leftWash.width = 110 + Math.max(0, -target.clamped) * 10;
        rightWash.width = 110 + Math.max(0, target.clamped) * 10;
      });
    };

    void mount();

    return () => {
      disposed = true;
      if (!initialized) return;
      app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    };
  }, []);

  return <div ref={hostRef} className="balance-scale-canvas" aria-hidden="true" />;
}
