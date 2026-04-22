import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './Sidebar.css';

const menuItems = [
  { path: '/', icon: 'fa-plus', label: '添加日程' },
  { path: '/thoughts', icon: 'fa-book', label: '我的思考' },
  { path: '/history', icon: 'fa-history', label: '历史记录' },
  { path: '/analysis', icon: 'fa-chart-line', label: '数据分析' },
  { path: '/settings', icon: 'fa-cog', label: '设置' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const sidebarClass = theme === 'minimal' ? 'minimal-theme' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${sidebarClass}`}>
      <div className="sidebar-header">
        <div className="app-title">情绪平衡日记</div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开' : '折叠'}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>

      <div className="user-info">
        <div className="user-avatar">
          <img
            src={user?.avatar || '/default-avatar.svg'}
            alt="头像"
            onError={(e) => {
              console.error('Sidebar 头像加载失败:', user?.avatar, e);
              (e.target as HTMLImageElement).src = '/default-avatar.svg';
            }}
          />
        </div>
        <div className="user-details">
          <h3>{user?.nickname || user?.username}</h3>
          <p>{user?.signature || '记录每一刻情绪'}</p>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="menu-item logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
