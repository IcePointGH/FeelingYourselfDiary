import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useEmotionLabels } from '../../contexts/EmotionLabelsContext';
import { useApi } from '../../hooks/useApi';
import { useFeelingMode } from '../../hooks/useFeelingMode';
import CollapsiblePanel from '../../components/CollapsiblePanel/CollapsiblePanel';
import DataManagement from './DataManagement';
import { SETTINGS_API, AUTH_API } from '../../services/api';
import type { FeelingSelectorMode } from '../../types';
import './Settings.css';

const DEFAULT_LABELS: Record<string, string> = {
  '3': '极好',
  '2': '很好',
  '1': '不错',
  '0': '平淡',
  '-1': '稍差',
  '-2': '不好',
  '-3': '极差',
};

const EMOTION_PLACEHOLDERS: Record<string, string> = {
  '3': '例如：非常开心',
  '2': '例如：开心',
  '1': '例如：有点开心',
  '0': '例如：平静',
  '-1': '例如：有点难过',
  '-2': '例如：难过',
  '-3': '例如：非常难过',
};

const EMOTION_ORDER = [3, 2, 1, 0, -1, -2, -3];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();
  const { refreshLabels } = useEmotionLabels();
  const { apiFetch } = useApi();
  const navigate = useNavigate();

  // Profile
  const [nickname, setNickname] = useState('');
  const [signature, setSignature] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Labels
  const [emotionLabels, setEmotionLabels] = useState<Record<string, string>>({ ...DEFAULT_LABELS });
  const [loading, setLoading] = useState(false);

  // Feeling selector mode
  const { mode: feelingMode, setMode: setFeelingMode } = useFeelingMode();

  // 感受描述联动我的思考
  const [autoSaveThoughts, setAutoSaveThoughts] = useState(false);

  // 自定义子面板切换
  type CustomSection = 'emotion' | 'mode' | 'thoughts' | null;
  const [customSection, setCustomSection] = useState<CustomSection>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await apiFetch(AUTH_API.me);
        setNickname(me.nickname || '');
        setSignature(me.signature || '');
        setAvatar(me.avatar || '');
      } catch {
        addToast('加载个人资料失败, 请刷新重试', 'error');
        if (user) {
          setNickname(user.nickname || '');
          setSignature(user.signature || '');
          setAvatar(user.avatar || '');
        }
      }
    };
    const loadSettings = async () => {
      try {
        const res = await apiFetch(SETTINGS_API.base);
        setAutoSaveThoughts(res.autoSaveThoughts ?? false);
        if (res.emotionLabels) {
          try {
            const parsed = JSON.parse(res.emotionLabels);
            setEmotionLabels({ ...DEFAULT_LABELS, ...parsed });
          } catch {
            // ignore invalid JSON
          }
        }
      } catch {
        addToast('加载设置失败, 请刷新重试', 'error');
      }
    };
    loadProfile();
    loadSettings();
  }, [apiFetch]);

  const handleSaveProfile = async () => {
    try {
      await apiFetch(SETTINGS_API.base, {
        method: 'PUT',
        body: JSON.stringify({ nickname, signature }),
      });
      addToast('保存成功', 'success');
    } catch {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.nickname = nickname;
        u.signature = signature;
        localStorage.setItem('user', JSON.stringify(u));
      }
      addToast('保存成功（本地）', 'success');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('请选择图片文件', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('图片大小不能超过5MB', 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const stored = localStorage.getItem('token');
      const res = await fetch(AUTH_API.avatar, {
        method: 'POST',
        headers: stored ? { Authorization: `Bearer ${stored}` } : {},
        body: formData,
      });

      const result = await res.json();
      if (result.code === 200 && result.data) {
        setAvatar(result.data);
        if (user) {
          updateUser({ ...user, avatar: result.data });
        }
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '头像上传失败，请检查网络或稍后重试', 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveLabels = async () => {
    setLoading(true);
    try {
      await apiFetch(SETTINGS_API.base, {
        method: 'PUT',
        body: JSON.stringify({ emotionLabels: JSON.stringify(emotionLabels) }),
      });
      await refreshLabels();
      addToast('情绪语言设置已保存', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSave = async (enabled: boolean) => {
    setAutoSaveThoughts(enabled);
    try {
      await apiFetch(SETTINGS_API.base, {
        method: 'PUT',
        body: JSON.stringify({ autoSaveThoughts: enabled }),
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存设置失败', 'error');
      setAutoSaveThoughts(!enabled); // rollback
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="settings-page">
      <div className="card">
        <h2>设置</h2>

        <CollapsiblePanel title="用户信息编辑">
          <div className="avatar-upload">
            <div className="avatar-preview" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatar || '/default-avatar.svg'}
                alt="头像"
                onError={(e) => {
                  console.error('Settings 头像加载失败:', avatar, e);
                  (e.target as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
              <div className="avatar-overlay">
                <span>{avatarUploading ? '上传中...' : '更换'}</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <span className="avatar-hint">支持 JPG/PNG/GIF/WebP，不超过 5MB</span>
          </div>
          <div className="form-group">
            <label>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="输入昵称"
            />
          </div>
          <div className="form-group">
            <label>签名</label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="输入个性签名"
            />
          </div>
          <button className="save-btn" onClick={handleSaveProfile} disabled={loading}>保存</button>
        </CollapsiblePanel>

        <CollapsiblePanel title="自定义">
          <div className="custom-nav">
            <button
              className={`custom-nav-btn ${customSection === 'emotion' ? 'active' : ''}`}
              onClick={() => setCustomSection(customSection === 'emotion' ? null : 'emotion')}
            >
              情绪语言
            </button>
            <button
              className={`custom-nav-btn ${customSection === 'mode' ? 'active' : ''}`}
              onClick={() => setCustomSection(customSection === 'mode' ? null : 'mode')}
            >
              数值选择
            </button>
            <button
              className={`custom-nav-btn ${customSection === 'thoughts' ? 'active' : ''}`}
              onClick={() => setCustomSection(customSection === 'thoughts' ? null : 'thoughts')}
            >
              日程与思考
            </button>
          </div>

          {customSection === 'emotion' && (
            <div className="custom-sub">
              <div className="emotion-options">
                {EMOTION_ORDER.map(val => (
                  <div className="emotion-form-group" key={val}>
                    <label htmlFor={`emotion-${val}`}>感受值 {val}</label>
                    <input
                      type="text"
                      id={`emotion-${val}`}
                      value={emotionLabels[String(val)]}
                      onChange={e =>
                        setEmotionLabels(prev => ({ ...prev, [val]: e.target.value }))
                      }
                      placeholder={EMOTION_PLACEHOLDERS[String(val)]}
                    />
                  </div>
                ))}
                <button className="save-btn" onClick={handleSaveLabels} disabled={loading}>保存情绪语言设置</button>
              </div>
            </div>
          )}

          {customSection === 'mode' && (
            <div className="custom-sub">
              <div className="theme-options">
                {(['buttons', 'slider'] as FeelingSelectorMode[]).map(opt => (
                  <div
                    key={opt}
                    className={`theme-option ${feelingMode === opt ? 'active' : ''}`}
                    onClick={() => setFeelingMode(opt)}
                  >
                    <div className={`theme-preview ${opt === 'slider' ? 'slider-preview' : 'buttons-preview'}`} />
                    <span>{opt === 'buttons' ? '按钮式' : '滑动式'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customSection === 'thoughts' && (
            <div className="custom-sub">
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">感受描述联动我的思考</span>
                  <span className="toggle-desc">添加日程时，感受描述将自动归档到我的思考中</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoSaveThoughts}
                    onChange={e => handleToggleAutoSave(e.target.checked)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel title="数据设置">
          <DataManagement />
        </CollapsiblePanel>

        <CollapsiblePanel title="使用手册">
          <div className="help-content">
            <p>使用手册内容将在此处显示。您可以在这里了解如何记录日程、书写日记、查看情绪分析等功能的使用方法。</p>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel title="开发者的话">
          <div className="about-content">
            <p>开发者的话将在此处显示。感谢您使用情绪平衡日记，希望它能陪伴您记录生活中的每一个瞬间。</p>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel title="账户操作">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" />
            <span>退出登录</span>
          </button>
        </CollapsiblePanel>
      </div>
    </div>
  );
}
