import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { KAOMOJI } from '../../utils/feeling';
import './Welcome.css';

export default function Welcome() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/schedule');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <div className="welcome-page">
      {/* Decorative background elements */}
      <div className="welcome-decorations">
        <span className="deco-sun" aria-hidden="true">☀️</span>
        <span className="deco-sun-kao" aria-hidden="true">{KAOMOJI['3']}</span>
        <span className="deco-rain" aria-hidden="true">🌧️</span>
        <span className="deco-rain-kao" aria-hidden="true">{KAOMOJI['-2']}</span>
        <span className="deco-float deco-1" aria-hidden="true">{KAOMOJI['2']}</span>
        <span className="deco-float deco-2" aria-hidden="true">{KAOMOJI['0']}</span>
        <span className="deco-float deco-3" aria-hidden="true">{KAOMOJI['1']}</span>
        <span className="deco-float deco-4" aria-hidden="true">{KAOMOJI['-1']}</span>
      </div>

      <div className="welcome-status-bar" ref={statusRef}>
        {isAuthenticated && user ? (
          <div className="status-logged-in" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <img
              src={user.avatar || '/default-avatar.svg'}
              alt=""
              className="status-avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
            <span className="status-name">{user.nickname || user.username}</span>
            <span className="status-badge">已登录</span>
            <i className={`fas fa-chevron-down status-arrow ${dropdownOpen ? 'open' : ''}`} />
            {dropdownOpen && (
              <div className="status-dropdown" onClick={(e) => e.stopPropagation()}>
                <button className="dropdown-logout-btn" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="status-not-logged">未登录</span>
        )}
      </div>

      <div className="welcome-hero">
        <img
          src="/LOGO-v1/横版-白-抠图后.png"
          alt="seven sense"
          className="welcome-logo"
        />
        <h1 className="welcome-title">情绪平衡日记</h1>
        <p className="welcome-tagline">记录每一刻情绪，了解真实的自己</p>
      </div>

      <div className="welcome-features">
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-calendar-check" />
          </div>
          <h3 className="feature-title">日程记录</h3>
          <p className="feature-desc">记录每日事项，为每条日程标注情绪值</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-book-open" />
          </div>
          <h3 className="feature-title">心情日记</h3>
          <p className="feature-desc">随时随地书写日记，回顾过往思绪</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-chart-pie" />
          </div>
          <h3 className="feature-title">情绪分析</h3>
          <p className="feature-desc">按日/周/月维度统计情绪走势，可视化分析</p>
        </div>
      </div>

      <div className="welcome-cta">
        <button className="welcome-start-btn" onClick={handleStart}>
          开始使用
        </button>
      </div>

      <footer className="welcome-footer">
        <p>已有账号？<a href="/login">立即登录</a></p>
      </footer>
    </div>
  );
}
