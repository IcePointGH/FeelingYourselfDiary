import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#6c6360',
          background: '#faf8f5'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 600 }}>
            页面出现了问题
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '24px', color: '#8a817c' }}>
            请刷新页面重试，如果问题持续存在请联系支持。
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 32px',
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              background: '#a69c97',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
