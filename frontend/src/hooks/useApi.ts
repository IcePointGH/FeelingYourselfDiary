import { useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export class RateLimitError extends Error {
  remaining: number;
  resetEpoch: number | null;

  constructor(message: string, remaining: number, resetEpoch: number | null) {
    super(message);
    this.name = 'RateLimitError';
    this.remaining = remaining;
    this.resetEpoch = resetEpoch;
  }
}

export function useApi() {
  const { token, logout } = useAuth();
  const lastHeadersRef = useRef<Headers | null>(null);

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Store response headers for quota extraction
    lastHeadersRef.current = res.headers;

    // 401 — session expired
    if (res.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    // 429 — rate limit exceeded (before generic !res.ok check)
    if (res.status === 429) {
      let msg = '今日AI调用次数已达上限（50次），请明天再试';
      let remaining = 0;
      let resetEpoch: number | null = null;
      try {
        const errorData = await res.json();
        msg = errorData.message || msg;
      } catch { /* ignore */ }
      const remainHeader = res.headers.get('X-RateLimit-Remaining');
      if (remainHeader !== null) remaining = parseInt(remainHeader, 10);
      const resetHeader = res.headers.get('X-RateLimit-Reset');
      if (resetHeader !== null) resetEpoch = parseInt(resetHeader, 10);
      throw new RateLimitError(msg, remaining, resetEpoch);
    }

    if (!res.ok) {
      let serverMsg = '';
      try {
        const errorData = await res.json();
        serverMsg = errorData.message || '';
      } catch { /* ignore */ }
      throw new Error(serverMsg || `请求失败 (${res.status})`);
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('服务器响应异常，请稍后重试');
    }

    if (data.code !== 200) {
      throw new Error(data.message || 'Request failed');
    }
    return data.data;
  }, [token, logout]);

  return { apiFetch, lastHeadersRef };
}
