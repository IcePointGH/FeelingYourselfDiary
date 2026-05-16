import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFieldValidation, required, matchField } from '../../hooks/useFieldValidation';
import './Register.module.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register, loading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // ── Inline validation ──
  const { errors, touchField, validateAll } = useFieldValidation(
    { username, password, confirmPassword },
    {
      username: required('请输入用户名'),
      password: required('请输入密码'),
      confirmPassword: matchField(password, '两次密码输入不一致'),
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (validateAll()) return;
    try {
      await register({ username, password, nickname });
      setSuccess('注册成功，正在跳转...');
      setTimeout(() => navigate('/schedule'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后再试');
    }
  };

  return (
    <div className="auth-page">
      <img         src={theme === 'dark' ? '/LOGO-v1/横版-暗-抠图后.png' : '/LOGO-v1/横版-白-抠图后.png'} alt="seven sense" className="auth-logo" />
      <div className="auth-container">
        <h2>注册</h2>
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={`form-group ${errors.username ? 'has-error' : ''}`}>
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={() => touchField('username')}
            />
            {errors.username && <div className="field-error">{errors.username}</div>}
          </div>
          <div className="form-group">
            <label>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="选填"
            />
          </div>
          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => touchField('password')}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>
          <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onBlur={() => touchField('confirmPassword')}
            />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary register-btn">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="auth-link">
          已有账号？ <Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
