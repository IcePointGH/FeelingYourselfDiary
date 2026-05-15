import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { KAOMOJI } from '../../utils/feeling';
import './Welcome.css';

const orbitItems = [
  { value: '-3', face: KAOMOJI['-3'], tone: 'neg-3' },
  { value: '-2', face: KAOMOJI['-2'], tone: 'neg-2' },
  { value: '-1', face: KAOMOJI['-1'], tone: 'neg-1' },
  { value: '0', face: KAOMOJI['0'], tone: 'zero' },
  { value: '+1', face: KAOMOJI['1'], tone: 'pos-1' },
  { value: '+2', face: KAOMOJI['2'], tone: 'pos-2' },
  { value: '+3', face: KAOMOJI['3'], tone: 'pos-3' },
] as const;

const heroRecords = [
  { time: '09:20', title: '晨间计划', mood: '+2', tone: 'positive' },
  { time: '14:10', title: '项目会议', mood: '-1', tone: 'negative' },
  { time: '22:40', title: '睡前日记', mood: '+1', tone: 'positive' },
] as const;

const storySections = [
  {
    kicker: '记录',
    title: '把发生的事和当时的感受放在一起',
    body: '不只记下今天做了什么，也留下它怎样影响了你。日程、情绪和文字会在同一条时间线上互相解释。',
    kind: 'record',
  },
  {
    kicker: '看见',
    title: '让零散波动慢慢显出轮廓',
    body: '当记录积累起来，趋势、转折和重复出现的片段会变得清楚，不必再只靠模糊记忆判断自己最近过得怎样。',
    kind: 'observe',
  },
  {
    kicker: '理解',
    title: '把感受整理成能回看的线索',
    body: '日记补上数字说不出的部分，AI 帮你复盘模式和变化，让你更容易理解自己，而不是被一次情绪带走。',
    kind: 'reflect',
  },
] as const;

export default function Welcome() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleStart = () => {
    navigate(isAuthenticated ? '/schedule' : '/login');
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <div className="welcome-page">
      <div className="welcome-orbit" aria-hidden="true">
        <span className="orbit-weather orbit-sun">☀️</span>
        <span className="orbit-weather orbit-rain">🌧️</span>
        {orbitItems.map((item, index) => (
          <span className={`orbit-face orbit-${item.tone}`} key={item.value} data-index={index}>
            {item.face}
          </span>
        ))}
      </div>

      <div className="welcome-status-bar" ref={statusRef}>
        {isAuthenticated && user ? (
          <div className="status-logged-in" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <img
              src={user.avatar || '/default-avatar.svg'}
              alt=""
              className="status-avatar"
              onError={(event) => {
                (event.target as HTMLImageElement).src = '/default-avatar.svg';
              }}
            />
            <span className="status-name">{user.nickname || user.username}</span>
            <span className="status-badge">已登录</span>
            <i className={`fas fa-chevron-down status-arrow ${dropdownOpen ? 'open' : ''}`} />
            {dropdownOpen && (
              <div className="status-dropdown" onClick={(event) => event.stopPropagation()}>
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

      <main className="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <img
              src={theme === 'dark' ? '/LOGO-v1/横版-暗-抠图后.png' : '/LOGO-v1/横版-白-抠图后.png'}
              alt="seven sense"
              className="welcome-logo"
            />
            <p className="welcome-eyebrow">Seven Sense</p>
            <h1 id="welcome-title" className="welcome-title">七种颜色，记录一天的起伏</h1>
            <p className="welcome-tagline">
              把日程、情绪和复盘放在一起，让你慢慢看见自己是怎样度过每一天的。
            </p>
            <div className="welcome-spectrum" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="welcome-actions">
              <button className="welcome-start-btn" onClick={handleStart}>
                <i className="fas fa-arrow-right" aria-hidden="true" />
                <span>{isAuthenticated ? '进入我的日记' : '开始使用'}</span>
              </button>
              <a className="welcome-secondary-link" href="#welcome-storyline">看看它如何工作</a>
            </div>
          </div>

          <div className="welcome-preview" aria-label="产品预览">
            <div className="preview-sheet">
              <div className="preview-sheet-head">
                <span>今日记录</span>
                <strong>+0.7</strong>
              </div>
              <div className="preview-trend" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="preview-records">
                {heroRecords.map((record) => (
                  <div className="preview-record" key={record.title}>
                    <span>{record.time}</span>
                    <strong>{record.title}</strong>
                    <b className={record.tone}>{record.mood}</b>
                  </div>
                ))}
              </div>
              <div className="preview-insight">
                <span>小七整理</span>
                <p>下午略有下滑，晚间逐渐回稳。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="welcome-storyline" id="welcome-storyline" aria-label="产品路径">
          {storySections.map((section) => (
            <article className={`story-step story-step--${section.kind}`} key={section.kind}>
              <div className="story-step-copy">
                <span className="section-kicker">{section.kicker}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>

              <div className="story-step-visual" aria-hidden="true">
                {section.kind === 'record' && (
                  <div className="record-visual">
                    <div><span>09:20</span><strong>晨间计划</strong><b>+2</b></div>
                    <div><span>14:10</span><strong>项目会议</strong><b>-1</b></div>
                    <div><span>22:40</span><strong>睡前日记</strong><b>+1</b></div>
                  </div>
                )}

                {section.kind === 'observe' && (
                  <div className="observe-visual">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}

                {section.kind === 'reflect' && (
                  <div className="reflect-visual">
                    <small>小七批注</small>
                    <p>这周不是一直低落，而是在高压之后更需要恢复时间。</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="welcome-final-cta" aria-label="开始使用">
          <span>Seven Sense</span>
          <h2>从今天的一条记录开始，慢慢看懂自己的情绪变化。</h2>
          <button className="welcome-start-btn" onClick={handleStart}>
            <i className="fas fa-arrow-right" aria-hidden="true" />
            <span>{isAuthenticated ? '进入记录' : '注册或登录'}</span>
          </button>
        </section>
      </main>

      <footer className="welcome-footer">
        <p>已有账号？<a href="/login">立即登录</a></p>
      </footer>
    </div>
  );
}
