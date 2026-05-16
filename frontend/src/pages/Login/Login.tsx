import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import './Login.css';

const EXPIRY_FLAG_KEY = 'session_expired';
const EXPIRY_RETURN_KEY = 'session_return_to';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, loading } = useAuth();
  const { theme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Show expiry toast and redirect back after login
  useEffect(() => {
    if (sessionStorage.getItem(EXPIRY_FLAG_KEY)) {
      addToast('会话已过期，请重新登录', 'warning');
      sessionStorage.removeItem(EXPIRY_FLAG_KEY);
    }
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await login({ username, password });
      const returnTo = sessionStorage.getItem(EXPIRY_RETURN_KEY);
      sessionStorage.removeItem(EXPIRY_RETURN_KEY);
      setSuccess('登录成功，正在跳转...');
      setTimeout(() => navigate(returnTo || '/schedule'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查用户名和密码');
    }
  };

  return (
    <div className="auth-page">
      <img         src={theme === 'dark' ? '/LOGO-v1/横版-暗-抠图后.png' : '/LOGO-v1/横版-白-抠图后.png'} alt="seven sense" className="auth-logo" />
      <div className="auth-container">
        <h2>登录</h2>
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="auth-link">
          还没有账号？ <Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
