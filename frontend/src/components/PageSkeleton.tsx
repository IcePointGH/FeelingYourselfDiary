import React, { useEffect } from 'react';

// Inject spinner keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'page-skeleton-spinner';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@keyframes ps-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

const PageSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#999',
        fontSize: '16px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #eee',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'ps-spin 0.6s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        加载中...
      </div>
    </div>
  );
};

export default PageSkeleton;
