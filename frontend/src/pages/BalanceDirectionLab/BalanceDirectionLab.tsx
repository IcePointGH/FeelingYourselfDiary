import { useState } from 'react';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';
import './BalanceDirectionLab.css';

const samples = [-3, -1, 0, 2, 5];

export default function BalanceDirectionLab() {
  const [total, setTotal] = useState(-2);
  const color = getMoodColor(total);
  const balanceText = total < -1 ? '今天有些偏沉' : total > 1 ? '今天被支撑托起' : '今天目前接近平衡';

  return (
    <main className="balance-lab">
      <header className="balance-lab-header">
        <span>Direction lab</span>
        <h1>状态栏与“平衡”隐喻备选</h1>
        <p>先选“它应该怎样常驻”，再选“它应该怎样表达大量情绪记录”。这些都只用网页可实现的方式预览。</p>
      </header>

      <div className="balance-lab-controls">
        {samples.map(value => (
          <button
            key={value}
            type="button"
            className={value === total ? 'active' : ''}
            onClick={() => setTotal(value)}
          >
            {formatFeelingValue(value)}
          </button>
        ))}
      </div>

      <section className="lab-section">
        <div className="section-heading">
          <h2>一、单行状态栏排列</h2>
          <p>同样都是“一行胶囊”，只比较数字、文字、图形的先后和权重。</p>
        </div>

        <div className="option-grid status-grid compact-grid">
          <article className="option-card">
            <h3>A. 图形 / 数字 / 文字</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-a">
                <i className="mini-vessel" />
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <span>{balanceText}</span>
              </div>
            </div>
            <p>最直观，先看见“状态”，再读数值。</p>
          </article>

          <article className="option-card">
            <h3>B. 数字 / 图形 / 文字</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-b">
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <i className="mini-vessel" />
                <span>{balanceText}</span>
              </div>
            </div>
            <p>数据优先，最像一个真正的状态栏。</p>
          </article>

          <article className="option-card">
            <h3>C. 文字 / 数字 / 图形</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-c">
                <span>{balanceText}</span>
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <i className="mini-vessel" />
              </div>
            </div>
            <p>语义先行，温柔，但首眼不如前两者利落。</p>
          </article>

          <article className="option-card">
            <h3>D. 数字 / 文字 / 图形</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-d">
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <span>{balanceText}</span>
                <i className="mini-vessel" />
              </div>
            </div>
            <p>我目前最看好：读数清楚，图形像一句安静的句号。</p>
          </article>

          <article className="option-card">
            <h3>E. 图形 / 文字 / 数字</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-e">
                <i className="mini-vessel" />
                <span>{balanceText}</span>
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
              </div>
            </div>
            <p>更柔和，像一句提示；数字存在但不主导。</p>
          </article>

          <article className="option-card">
            <h3>F. 文字 / 图形 / 数字</h3>
            <div className="stage top-stage">
              <div className="status-pill soft order-f">
                <span>{balanceText}</span>
                <i className="mini-vessel" />
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
              </div>
            </div>
            <p>最接近通知条，阅读顺滑，但辨识度略弱。</p>
          </article>
        </div>
      </section>

      <section className="lab-section">
        <div className="section-heading">
          <h2>二、水位如何嵌入状态栏</h2>
          <p>都基于“情绪水位”，只比较它在单行状态栏里的存在方式。</p>
        </div>

        <div className="option-grid metaphor-grid">
          <article className="option-card">
            <h3>A. 独立小瓶</h3>
            <div className="stage embed-stage">
              <div className="embed-pill">
                <i className="water-vessel"><b style={{ height: `${50 + total * 8}%` }} /></i>
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <span>{balanceText}</span>
              </div>
            </div>
            <p>最清楚，图形有实体感，适合当品牌记忆点。</p>
          </article>

          <article className="option-card">
            <h3>B. 数字内嵌</h3>
            <div className="stage embed-stage">
              <div className="embed-pill inline-water">
                <i className="water-vessel"><b style={{ height: `${50 + total * 8}%` }} /></i>
                <span>{balanceText}</span>
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
              </div>
            </div>
            <p>数字和图形绑定最紧，但可读性略受影响。</p>
          </article>

          <article className="option-card">
            <h3>C. 背景水位</h3>
            <div className="stage embed-stage">
              <div className="embed-pill background-water">
                <b style={{ width: `${50 + total * 8}%` }} />
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <span>{balanceText}</span>
              </div>
            </div>
            <p>最省空间，水位退成气氛层，适合极简路线。</p>
          </article>

          <article className="option-card">
            <h3>D. 仅留刻度</h3>
            <div className="stage embed-stage">
              <div className="embed-pill gauge-water">
                <strong style={{ color }}>{formatFeelingValue(total)}</strong>
                <span>{balanceText}</span>
                <i><b style={{ width: `${50 + total * 8}%` }} /></i>
              </div>
            </div>
            <p>最像成熟产品组件，图形弱化到只剩一条细刻度。</p>
          </article>
        </div>
      </section>

      <section className="lab-section">
        <div className="section-heading">
          <h2>三、天平选择器里 0 的表达</h2>
          <p>天平只负责“选择一个值”，所以问题只剩：0 要不要有一个明确反馈。</p>
        </div>

        <div className="option-grid zero-grid">
          <article className="option-card">
            <h3>A. 两侧留空</h3>
            <div className="stage zero-stage zero-empty"><div className="zero-beam" /></div>
            <p>最克制，但 0 容易看起来像“还没加载”。</p>
          </article>

          <article className="option-card">
            <h3>B. 中央小珠</h3>
            <div className="stage zero-stage zero-center"><div className="zero-beam" /><i /></div>
            <p>我最推荐。明确表达“正落在中点”，又不破坏天平逻辑。</p>
          </article>

          <article className="option-card">
            <h3>C. 两侧半珠</h3>
            <div className="stage zero-stage zero-split"><div className="zero-beam" /><i /><b /></div>
            <p>画面更丰富，但语义不如 B 干净。</p>
          </article>
        </div>
      </section>
    </main>
  );
}
