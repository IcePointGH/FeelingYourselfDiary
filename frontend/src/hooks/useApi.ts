import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useApi() {
  const { token, logout } = useAuth();

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

    if (res.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      throw new Error(`请求失败 (${res.status})`);
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

  return { apiFetch };
}
