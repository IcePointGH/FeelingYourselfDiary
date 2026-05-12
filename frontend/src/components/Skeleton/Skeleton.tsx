import { useMemo } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'rect' | 'circle';
  count?: number;
}

export default function Skeleton({
  width = '100%',
  height = '16px',
  variant = 'text',
  count = 1,
}: SkeletonProps) {
  const classNames = useMemo(() => {
    const base = styles.skeleton;
    const v = variant === 'circle'
      ? styles.circle
      : variant === 'rect'
        ? styles.rect
        : styles.text;
    return `${base} ${v}`;
  }, [variant]);

  const items = useMemo(() => {
    const style: React.CSSProperties = { width, height };
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className={classNames} style={style} />
    ));
  }, [count, width, height, classNames]);

  return <>{items}</>;
}
