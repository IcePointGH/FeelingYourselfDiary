import './IcpFooter.css';

type IcpFooterProps = {
  className?: string;
};

export default function IcpFooter({ className = '' }: IcpFooterProps) {
  return (
    <div className={`icp-footer ${className}`.trim()}>
      <span className="icp-footer__copyright">
        Copyright © 2026 All Contributors
      </span>
      <a
        className="icp-footer__link"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        皖ICP备2026013949号-1
      </a>
      <a className="icp-footer__link" href="/privacy-policy">
        隐私政策
      </a>
      <a
        className="icp-footer__link icp-footer__police"
        href="https://beian.mps.gov.cn/#/query/webSearch?code=34130202000863"
        target="_blank"
        rel="noreferrer"
      >
        <img src="/备案图标.png" alt="" aria-hidden="true" />
        <span>皖公网安备34130202000863号</span>
      </a>
    </div>
  );
}
