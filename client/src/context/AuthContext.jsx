import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const normalizeUser = (u) => {
  if (!u) return null;
  return {
    ...u,
    userId: u.userId || u._id,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync freshest user data from backend on startup or token availability
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api
        .get('/auth/me')
        .then(({ data }) => {
          if (data?.data?.user) {
            const normalized = normalizeUser(data.data.user);
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
          }
        })
        .catch((err) => {
          if (err.response?.status === 401 && !localStorage.getItem('accessToken')) {
            localStorage.clear();
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = data.data;
    const normalized = normalizeUser(u);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const { user: u, accessToken, refreshToken } = data.data;
    const normalized = normalizeUser(u);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = normalizeUser({ ...(prev || {}), ...updates });
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data?.data?.user) {
        const normalized = normalizeUser(data.data.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      }
    } catch {}
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
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
