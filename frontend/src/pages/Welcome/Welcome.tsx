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
    kicker: '量化',
    title: '量化与分析',
    body: [
      '模糊的情绪转化为数值记录下来，这个过程，本身就有对自己当下情绪的确认与感知。',
      '以及我们加入图表分析、AI 分析，希望使用者能够清晰观察到自己的情绪变化。',
      '在这个功能中，我们加入了各种创意、制作了不同的交互动画，以带来轻松有趣的使用体验。',
    ],
    kind: 'record',
  },
  {
    kicker: '回顾',
    title: '记录与回顾',
    body: [
      '（以文字方式）输出是一种有效的、重要的疏解情绪的方法。我们把脑袋里的纷乱的想法转移到纸面上、电子数据里，在记录的同时，完成了一次整理，让想法更加有序。同时，为大脑腾出了思考的空间，让我们不再执着于某些问题，而是去专注于做好现实的事。',
      '我们提供自主书写的板块，如果心情很乱、无法动笔，也可以尝试和 AI 聊聊，它来帮你整理思绪。',
      '当然，你还可以去回顾自己的情绪变化历程。',
    ],
    kind: 'observe',
  },
  {
    kicker: '规划',
    title: '审视与规划',
    body: [
      '最重要的问题是，我们对一日情绪的评价，常常被一天中感受最强烈的事、或最晚发生的事（峰终效应）干扰。',
      '当你晚上为了某个期限临近的任务焦头烂额，也请别忘记今天吃过一顿丰盛的午饭；当你被阵雨拦住回家的路，也请别忘记刚刚在外游玩的自由快乐。',
      '我们难以避免遇到令人身心俱疲的事，除了回想快乐的记忆，还可以把它们添加到待办里，去创造快乐、寻找放松。',
      '这就是情绪平衡日记，是日记，更是规划。帮助你找回今天情绪的平衡感，并且利用它更好地迎接明天。',
    ],
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
              <a className="welcome-secondary-link" href="#welcome-storyline">功能介绍</a>
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
                <div className="story-step-body">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
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
