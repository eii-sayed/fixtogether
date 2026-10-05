import axios from 'axios';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    if (!envUrl || envUrl.includes('api.fixtogether.com') || envUrl.includes('localhost')) {
      return 'https://fixtogether-api.onrender.com/api/v1';
    }
  }
  if (envUrl && !envUrl.includes('api.fixtogether.com')) {
    return envUrl;
  }
  return 'http://localhost:5000/api/v1';
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken') || localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh and 429
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || error.response?.headers?.['retry-after'];
      const rateLimitError = new Error(
        error.response?.data?.message || 'Too many requests. Please wait and try again.'
      );
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      rateLimitError.retryAfter = retryAfter;
      rateLimitError.response = error.response;
      return Promise.reject(rateLimitError);
    }

    const isTokenExpired =
      error.response?.status === 401 &&
      (error.response?.data?.code === 'TOKEN_EXPIRED' ||
       error.response?.data?.message?.toLowerCase().includes('token expired') ||
       error.response?.data?.message?.toLowerCase().includes('jwt expired'));

    if (isTokenExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('adminRefreshToken') || localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken }, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('adminAccessToken', newToken);
        if (data.data.refreshToken) localStorage.setItem('adminRefreshToken', data.data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (refreshError.response?.status === 401) {
          localStorage.removeItem('adminAccessToken');
          localStorage.removeItem('adminRefreshToken');
          localStorage.removeItem('adminUser');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
