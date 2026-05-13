import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { KAOMOJI } from '../../utils/feeling';
import './Welcome.css';

const productHighlights = [
  {
    icon: 'fa-calendar-check',
    title: '把事件和情绪放在一起',
    desc: '记录日程时同步标注 -3 到 +3 的情绪值，事后能看清哪类安排真正影响你。',
  },
  {
    icon: 'fa-book-open',
    title: '给当天的自己留一段话',
    desc: '用日记补足数字背后的原因，把零散感受沉淀成可回看的个人线索。',
  },
  {
    icon: 'fa-chart-line',
    title: '看见长期情绪走势',
    desc: '按日、周、月查看趋势，不靠记忆猜测，而是用记录发现状态变化。',
  },
  {
    icon: 'fa-wand-magic-sparkles',
    title: '用 AI 做温和复盘',
    desc: '当记录变多后，让 AI 帮你整理模式、提出观察，不替你下结论。',
  },
];

const scenarioExamples = [
  {
    label: '工作日复盘',
    title: '找出消耗你的真实环节',
    desc: '会议、通勤、深度工作、社交回复分别标注情绪，周末回看时更容易发现压力来源。',
    mood: '-1.4',
    tone: 'warm',
  },
  {
    label: '低落时期',
    title: '把模糊难受拆成线索',
    desc: '用日记写下触发点，再配合连续几天的情绪曲线，确认是睡眠、关系还是任务堆积。',
    mood: '-2.0',
    tone: 'blue',
  },
  {
    label: '习惯调整',
    title: '验证哪些安排真的有帮助',
    desc: '运动、早睡、独处、阅读不只记录是否完成，也记录完成后的感受变化。',
    mood: '+1.8',
    tone: 'green',
  },
];

const previewItems = [
  { time: '09:20', title: '晨间计划', mood: '+2', className: 'positive' },
  { time: '14:10', title: '项目会议', mood: '-1', className: 'negative' },
  { time: '22:40', title: '睡前日记', mood: '+1', className: 'positive' },
];

export default function Welcome() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme } = useTheme();
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

      <main className="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <img
              src={theme === 'dark' ? '/LOGO-v1/横版-暗-抠图后.png' : '/LOGO-v1/横版-白-抠图后.png'}
              alt="seven sense"
              className="welcome-logo"
            />
            <p className="welcome-eyebrow">你的情绪记录 · 日程复盘 · 个人洞察</p>
            <h1 id="welcome-title" className="welcome-title">情绪平衡日记</h1>
            <p className="welcome-tagline">
              像看应用商店介绍一样先了解它：这里不是单纯写日记，而是把每天发生的事、当时的心情、之后的复盘放进同一条时间线。
            </p>
            <div className="welcome-actions">
              <button className="welcome-start-btn" onClick={handleStart}>
                <i className="fas fa-arrow-right" aria-hidden="true" />
                <span>{isAuthenticated ? '进入我的日记' : '开始使用'}</span>
              </button>
              <a className="welcome-secondary-link" href="#welcome-scenes">查看使用场景</a>
            </div>
          </div>

          <div className="welcome-preview" aria-label="产品预览">
            <div className="preview-poster">
              <div className="poster-header">
                <span className="poster-kicker">Preview</span>
                <span className="poster-play" aria-hidden="true">
                  <i className="fas fa-play" aria-hidden="true" />
                </span>
              </div>
              <div className="phone-shell">
                <div className="phone-topbar" />
                <div className="phone-title-row">
                  <span>今日情绪</span>
                  <strong>+0.7</strong>
                </div>
                <div className="mood-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="preview-list">
                  {previewItems.map(item => (
                    <div className="preview-item" key={item.title}>
                      <span className="preview-time">{item.time}</span>
                      <span className="preview-title">{item.title}</span>
                      <span className={`preview-mood ${item.className}`}>{item.mood}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="poster-caption">
                <strong>30 秒认识自己的一天</strong>
                <span>记录不是负担，而是给未来的自己一份可读的证据。</span>
              </div>
            </div>
          </div>
        </section>

        <section className="welcome-section welcome-intro" aria-labelledby="intro-title">
          <div className="section-heading">
            <span className="section-kicker">Product tour</span>
            <h2 id="intro-title">从记录到理解，一条完整路径</h2>
          </div>
          <div className="welcome-features">
            {productHighlights.map(feature => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-icon">
                  <i className={`fas ${feature.icon}`} aria-hidden="true" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="welcome-section welcome-scenes" id="welcome-scenes" aria-labelledby="scenes-title">
          <div className="section-heading">
            <span className="section-kicker">Use cases</span>
            <h2 id="scenes-title">什么时候会用到它</h2>
          </div>
          <div className="scenario-grid">
            {scenarioExamples.map(scenario => (
              <article className={`scenario-card ${scenario.tone}`} key={scenario.title}>
                <div className="scenario-card-top">
                  <span>{scenario.label}</span>
                  <strong>{scenario.mood}</strong>
                </div>
                <h3>{scenario.title}</h3>
                <p>{scenario.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="welcome-section welcome-story" aria-label="图文介绍">
          <div className="story-visual" aria-hidden="true">
            <div className="story-calendar">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <b />
              <b />
              <b />
              <b />
              <b />
            </div>
            <div className="story-note">
              <span>今天的线索</span>
              <p>下午会议后明显下滑，晚饭散步后恢复。</p>
            </div>
          </div>
          <div className="story-copy">
            <span className="section-kicker">Why it matters</span>
            <h2>它帮你回答的不是“我今天好不好”，而是“为什么会这样”。</h2>
            <p>
              情绪经常被记成一句笼统的“还行”或“很糟”。Seven Sense 会鼓励你把事件、情绪数值和文字复盘串起来，
              让下一次回看时能看见具体原因，而不是只剩模糊印象。
            </p>
          </div>
        </section>

        <section className="welcome-final-cta" aria-label="开始使用">
          <h2>准备好建立自己的情绪地图了吗？</h2>
          <p>先从今天的一条日程、一段日记开始。</p>
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
