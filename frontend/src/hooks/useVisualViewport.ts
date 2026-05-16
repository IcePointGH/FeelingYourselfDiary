import { useState, useEffect, useCallback } from 'react';

interface VisualViewportState {
  height: number;
  offsetTop: number;
  keyboardDelta: number;
  isKeyboardOpen: boolean;
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardDelta: 0,
    isKeyboardOpen: false,
  }));

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (vv) {
      const fullHeight = window.innerHeight;
      const keyboardDelta = fullHeight - vv.height - vv.offsetTop;
      setState({
        height: vv.height,
        offsetTop: vv.offsetTop,
        keyboardDelta: Math.max(0, keyboardDelta),
        isKeyboardOpen: keyboardDelta > 150,
      });

      document.documentElement.style.setProperty(
        '--app-viewport-height',
        `${vv.height}px`
      );
    }
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--app-viewport-height');
    };
  }, [update]);

  return state;
}
