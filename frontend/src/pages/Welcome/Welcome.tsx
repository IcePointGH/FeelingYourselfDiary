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
  { title: '和好朋友的聚餐', mood: '+2', tone: 'positive' },
  { title: '终于完成今日工作', mood: '-3', tone: 'negative' },
  { title: '睡前洗个热水澡', mood: '+1', tone: 'positive' },
] as const;

const storySections = [
  {
    title: '量化与分析',
    body: [
      '模糊的情绪转化为数值记录下来，这个过程，本身就有对自己当下情绪的确认与感知。',
      '以及我们加入图表分析、AI 分析，希望使用者能够清晰观察到自己的情绪变化。',
      '在这个功能中，我们加入了各种创意、制作了不同的交互动画，以带来轻松有趣的使用体验。',
    ],
    kind: 'record',
  },
  {
    title: '记录与回顾',
    body: [
      '（以文字方式）输出是一种有效的、重要的疏解情绪的方法。我们把脑袋里的纷乱的想法转移到纸面上、电子数据里，在记录的同时，完成了一次整理，让想法更加有序。同时，为大脑腾出了思考的空间，让我们不再执着于某些问题，而是去专注于做好现实的事。',
      '我们提供自主书写的板块，如果心情很乱、无法动笔，也可以尝试和 AI 聊聊，它来帮你整理思绪。',
      '当然，你还可以去回顾自己的情绪变化历程。',
    ],
    kind: 'observe',
  },
  {
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

  const handleScrollToStoryline = () => {
    document.getElementById('welcome-storyline')?.scrollIntoView({ behavior: 'smooth' });
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
            <h1 id="welcome-title" className="welcome-title">情绪平衡日记</h1>
            <p className="welcome-tagline">是日记，更是规划。</p>
            <div className="welcome-actions">
              <button className="welcome-start-btn" onClick={handleStart}>
                <i className="fas fa-arrow-right" aria-hidden="true" />
                <span>{isAuthenticated ? '进入我的日记' : '开始使用'}</span>
              </button>
              <button type="button" className="welcome-secondary-link" onClick={handleScrollToStoryline}>功能介绍</button>
            </div>
          </div>

          <div className="welcome-preview" aria-label="产品预览">
            <div className="preview-sheet">
              <div className="preview-sheet-head">
                <span>今日日程</span>
                <strong>+1</strong>
              </div>
              <div className="preview-records">
                {heroRecords.map((record) => (
                  <div className="preview-record" key={record.title}>
                    <strong>{record.title}</strong>
                    <b className={record.tone}>{record.mood}</b>
                  </div>
                ))}
              </div>
              <div className="preview-insight">
                <span>小七提醒</span>
                <p>今天还有些偏沉。睡前也可以给自己留一点恢复时间。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="welcome-storyline" id="welcome-storyline" aria-label="产品路径">
          {storySections.map((section) => (
            <article className={`story-step story-step--${section.kind}`} key={section.kind}>
              <div className="story-step-copy">
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
                    <svg viewBox="0 0 320 180" role="presentation">
                      <g className="chart-grid">
                        <line x1="42" y1="28" x2="292" y2="28" />
                        <line x1="42" y1="60" x2="292" y2="60" />
                        <line x1="42" y1="92" x2="292" y2="92" />
                        <line x1="42" y1="124" x2="292" y2="124" />
                        <line x1="42" y1="156" x2="292" y2="156" />
                      </g>
                      <g className="chart-axis">
                        <line x1="42" y1="20" x2="42" y2="156" />
                        <line x1="42" y1="156" x2="292" y2="156" />
                        <text x="26" y="31">+3</text>
                        <text x="26" y="63">+2</text>
                        <text x="26" y="95">0</text>
                        <text x="24" y="127">-1</text>
                        <text x="24" y="159">-2</text>
                        <text x="54" y="172">09:20</text>
                        <text x="124" y="172">13:10</text>
                        <text x="194" y="172">17:40</text>
                        <text x="256" y="172">22:30</text>
                      </g>
                      <line className="chart-zero" x1="42" y1="92" x2="292" y2="92" />
                      <path d="M58 124 C88 124 100 60 126 60 S156 28 182 28 S214 124 238 124 S264 60 280 60" />
                      <circle className="neg-1" cx="58" cy="124" r="5" />
                      <circle className="pos-2" cx="126" cy="60" r="5" />
                      <circle className="pos-3" cx="182" cy="28" r="5" />
                      <circle className="neg-1" cx="238" cy="124" r="5" />
                      <circle className="pos-2" cx="280" cy="60" r="5" />
                    </svg>
                  </div>
                )}

                {section.kind === 'observe' && (
                  <div className="observe-visual">
                    <div className="thought-form-visual">
                      <label>标题</label>
                      <div className="thought-input">
                        <span className="thought-line medium" />
                      </div>
                      <label>日期</label>
                      <div className="thought-input compact">
                        <span className="thought-line short" />
                        <i className="far fa-calendar-alt" aria-hidden="true" />
                      </div>
                      <label>内容</label>
                      <div className="thought-textarea">
                        <span className="thought-line long" />
                        <span className="thought-line wide" />
                        <span className="thought-line medium" />
                        <button type="button" tabIndex={-1}>保存</button>
                      </div>
                    </div>
                  </div>
                )}

                {section.kind === 'reflect' && (
                  <div className="reflect-visual">
                    <div><strong>和好朋友的聚餐</strong><b>+2</b></div>
                    <div><strong>终于完成今日工作</strong><b>-3</b></div>
                    <div><strong>睡前洗个热水澡</strong><b>+1</b></div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="welcome-final-cta" aria-label="开始使用">
          <span>Seven Sense</span>
          <h2>找回情绪平衡，从记录你的第一条日程开始。</h2>
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
