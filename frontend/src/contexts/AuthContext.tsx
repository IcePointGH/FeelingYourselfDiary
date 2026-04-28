import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import { AUTH_API } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  // eslint-disable-next-line no-unused-vars
  login: (data: LoginRequest) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  // eslint-disable-next-line no-unused-vars
  updateUser: (user: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (data: LoginRequest) => {
    setLoading(true);
    try {
      const res = await fetch(AUTH_API.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.code === 200) {
        const authData: AuthResponse = result.data;
        // ===== 生产部署前注意 =====todo
        // Token 当前存储在 localStorage（XSS 可访问），生产环境建议改用 httpOnly Cookie
        // 同时需要后端配合：JWT 通过 Set-Cookie 返回，设置 httpOnly + Secure + SameSite=Strict
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        setToken(authData.token);
        setUser(authData.user);
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true);
    try {
      const res = await fetch(AUTH_API.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.code === 200) {
        const authData: AuthResponse = result.data;
        // ===== 生产部署前注意 =====todo
        // Token 当前存储在 localStorage（XSS 可访问），生产环境建议改用 httpOnly Cookie
        // 同时需要后端配合：JWT 通过 Set-Cookie 返回，设置 httpOnly + Secure + SameSite=Strict
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        setToken(authData.token);
        setUser(authData.user);
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      updateUser,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
