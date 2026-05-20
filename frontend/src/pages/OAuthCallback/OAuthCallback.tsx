import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AUTH_API } from '../../services/api';
import type { ApiResponse, AuthResponse } from '../../types';
import './OAuthCallback.css';

const EXPIRY_RETURN_KEY = 'session_return_to';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const { applyAuthResponse } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

    if (!ticket) {
      setError('第三方登录凭证缺失，请重新登录。');
      return;
    }

    let cancelled = false;

    async function completeLogin() {
      try {
        const response = await fetch(AUTH_API.oauthComplete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket }),
        });
        const result = await readApiResponse(response);
        if (result.code !== 200) {
          throw new Error(result.message || '第三方登录失败');
        }
        if (cancelled) return;
        applyAuthResponse(result.data);
        sessionStorage.removeItem(EXPIRY_RETURN_KEY);
        navigate(returnTo, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '第三方登录失败，请重新尝试。');
        }
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [applyAuthResponse, navigate, searchParams]);

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-panel">
        {error ? (
          <>
            <h1>登录失败</h1>
            <p>{error}</p>
            <Link to="/login" className="ui-btn ui-btn-primary oauth-callback-action">
              返回登录
            </Link>
          </>
        ) : (
          <>
            <h1>正在登录</h1>
            <p>正在完成第三方登录，请稍候。</p>
          </>
        )}
      </div>
    </div>
  );
}

async function readApiResponse(response: Response): Promise<ApiResponse<AuthResponse>> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(text || `第三方登录失败，服务端返回 ${response.status}`);
}

function sanitizeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/schedule';
  }
  return value;
}
