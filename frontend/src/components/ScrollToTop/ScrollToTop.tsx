import { useState, useEffect } from 'react';
import './ScrollToTop.css';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (!container) return;
    const onScroll = () => setVisible(container.scrollTop > 400);
    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button className="scroll-top-btn" onClick={handleClick} aria-label="回到顶部">
      <i className="fas fa-arrow-up" />
    </button>
  );
}
