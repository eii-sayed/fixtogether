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
    const saved = localStorage.getItem('adminUser');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync freshest admin user data from backend
  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken') || localStorage.getItem('accessToken');
    if (token) {
      api
        .get('/auth/me')
        .then(({ data }) => {
          const u = data?.data?.user;
          if (u && u.role === 'admin') {
            const normalized = normalizeUser(u);
            setUser(normalized);
            localStorage.setItem('adminUser', JSON.stringify(normalized));
            localStorage.setItem('adminAccessToken', token);
          } else {
            // Not an admin
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('adminRefreshToken');
            localStorage.removeItem('adminUser');
            setUser(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('adminAccessToken');
          localStorage.removeItem('adminRefreshToken');
          localStorage.removeItem('adminUser');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = data.data;

    if (u.role !== 'admin') {
      throw new Error('Access denied. Administrator privileges are required to access this portal.');
    }

    const normalized = normalizeUser(u);
    localStorage.setItem('adminAccessToken', accessToken);
    localStorage.setItem('adminRefreshToken', refreshToken);
    localStorage.setItem('adminUser', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user && user.role === 'admin',
    isAdmin: user?.role === 'admin',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
