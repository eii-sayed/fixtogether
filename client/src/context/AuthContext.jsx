import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data.data.user);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        })
        .catch(() => { localStorage.clear(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const { user: u, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }, [user]);

  const value = {
    user, loading, login, register, logout, updateUser,
    isAuthenticated: !!user,
    isOwner: user?.role === 'owner',
    isTechnician: user?.role === 'technician',
    isOrganization: user?.role === 'organization',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
