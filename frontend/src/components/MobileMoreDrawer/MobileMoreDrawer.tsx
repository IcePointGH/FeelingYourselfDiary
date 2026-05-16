import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './MobileMoreDrawer.module.css';

const drawerItems = [
  { path: '/history', icon: 'fa-history', label: '历史记录' },
  { path: '/settings', icon: 'fa-cog', label: '设置' },
];

interface MobileMoreDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMoreDrawer({ open, onClose }: MobileMoreDrawerProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActive?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div
      className={`${styles.overlay} ${theme === 'dark' ? styles.dark : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="更多菜单"
    >
      <div
        className={styles.sheet}
        ref={drawerRef}
      >
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <img
                src={user?.avatar || '/default-avatar.svg'}
                alt="头像"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.nickname || user?.username}</div>
              <div className={styles.userSignature}>{user?.signature || '记录每一刻情绪'}</div>
            </div>
          </div>
        </div>

        <nav className={styles.menu}>
          {drawerItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`
              }
              onClick={onClose}
              end
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            type="button"
          >
            <i className="fas fa-sign-out-alt" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  );
}
