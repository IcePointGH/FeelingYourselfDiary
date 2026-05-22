import { Link } from 'react-router-dom';
import IcpFooter from '../../components/IcpFooter/IcpFooter';
import './PrivacyPolicy.css';

const sections = [
  {
    title: '一、我们处理的信息',
    body: [
      '账号信息：用户名、密码加密结果、昵称、头像、个性签名、登录状态与必要的安全记录。',
      '你主动记录的内容：日程、情绪评分、情绪标签、日记、AI 对话、AI 分析所需的上下文，以及你在设置中保存的偏好。',
      '运行与安全信息：请求时间、接口访问记录、错误日志、设备网络信息中的必要部分，用于保障服务可用性、排查故障和防止未授权访问。',
    ],
  },
  {
    title: '二、我们如何使用这些信息',
    body: [
      '用于创建和登录账号、保存你的日程与日记、生成情绪统计图表、提供 AI 对话或分析、同步你的个性化设置。',
      '用于维护系统安全、定位异常、改进比赛展示版本的稳定性。我们不会将你的个人记录用于广告投放，也不会开放给其他用户查看。',
      '情绪、日记、AI 对话可能涉及较私密的个人体验。你可以选择不填写或随时删除相关内容；不填写不会影响基础浏览和账号登录。',
    ],
  },
  {
    title: '三、第三方服务',
    body: [
      '当你使用 AI 功能时，系统可能会把你选择的日程、日记、对话内容或摘要发送给大模型服务提供方，用于生成回复或分析结果。',
      '头像等文件可能存储在对象存储服务中；系统也会使用数据库、缓存和反向代理等基础设施保存或传输必要数据。',
      '除完成上述功能、遵守法律法规、保障安全或取得你的明确授权外，我们不会主动向无关第三方披露你的个人记录。',
    ],
  },
  {
    title: '四、保存、删除与安全',
    body: [
      '我们会在实现功能所需期间保存你的信息。账号存在期间，你的记录会持续保存；你删除内容或请求删除账号后，我们会在合理时间内删除或匿名化相关数据。',
      '因备份、日志、安全审计或法律要求，部分记录可能在有限期间内继续保留，到期后删除或匿名化。',
      '我们采用登录鉴权、密码加密、访问控制、HTTPS 传输等措施保护数据，但互联网服务无法保证绝对安全，请避免记录不必要的高敏感信息。',
    ],
  },
  {
    title: '五、你的权利',
    body: [
      '你可以在产品内查看、修改、删除自己的日程、日记、头像、昵称、签名和偏好设置。',
      '如需导出数据、删除账号、撤回授权、咨询个人信息处理情况，或发现数据安全问题，可以通过项目仓库 Issues 联系维护者。',
      '如果你不同意本政策，请停止注册或使用需要账号的功能；继续使用相关功能即表示你理解相应的数据处理方式。',
    ],
  },
  {
    title: '六、适用范围与更新',
    body: [
      '本政策适用于 Seven Sense 情绪平衡日记网站及其配套后端服务。项目目前为比赛与学习展示用途，不包含付费功能。',
      '当功能、数据处理方式或第三方服务发生重要变化时，我们会更新本政策，并在页面中标明新的生效日期。',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <main className="policy-container">
        <header className="policy-header">
          <Link to="/" className="policy-back-link">
            返回首页
          </Link>
          <h1>隐私政策</h1>
          <p>生效日期：2026 年 5 月 22 日</p>
        </header>

        <section className="policy-intro">
          <p>
            Seven Sense 情绪平衡日记尊重并保护你的个人信息。本政策说明我们在提供账号、日程记录、情绪分析、日记和 AI 辅助功能时如何收集、使用、保存和保护信息。
          </p>
        </section>

        {sections.map(section => (
          <section className="policy-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className="policy-section">
          <h2>七、联系方式</h2>
          <p>
            如需行使个人信息相关权利或反馈隐私问题，请通过 GitHub 仓库 IcePointGH/FeelingYourselfDiary 的 Issues 联系项目维护者。
          </p>
        </section>
      </main>

      <IcpFooter className="policy-icp-footer" />
    </div>
  );
}
