import './IcpFooter.css';

type IcpFooterProps = {
  className?: string;
};

export default function IcpFooter({ className = '' }: IcpFooterProps) {
  return (
    <div className={`icp-footer ${className}`.trim()}>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        皖ICP备2026013949号-1
      </a>
    </div>
  );
}
