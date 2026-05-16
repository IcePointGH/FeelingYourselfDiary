import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './MobileNav.module.css';

const navItems = [
  { path: '/schedule', icon: 'fa-calendar-plus', label: '日程' },
  { path: '/thoughts', icon: 'fa-book', label: '思考' },
  { path: '/analysis', icon: 'fa-chart-line', label: '分析' },
  { path: '/ai', icon: 'fa-comments', label: 'AI' },
];

interface MobileNavProps {
  onMoreClick: () => void;
}

export default function MobileNav({ onMoreClick }: MobileNavProps) {
  const { theme } = useTheme();

  return (
    <nav
      className={`${styles.nav} ${theme === 'dark' ? styles.dark : ''}`}
      role="navigation"
      aria-label="主导航"
    >
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
          end={item.path === '/schedule'}
        >
          <i className={`fas ${item.icon}`} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        className={styles.item}
        onClick={onMoreClick}
        type="button"
        aria-label="更多"
      >
        <i className="fas fa-ellipsis-h" />
        <span>更多</span>
      </button>
    </nav>
  );
}
