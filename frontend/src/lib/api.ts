import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('a3_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('a3_refresh_token');
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }
        
        // Call refresh endpoint
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token, refresh_token } = res.data;
        
        localStorage.setItem('a3_access_token', access_token);
        localStorage.setItem('a3_refresh_token', refresh_token);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed: clear storage and redirect
        console.error("Refresh token rotation failed. Logging out...", refreshError);
        localStorage.removeItem('a3_access_token');
        localStorage.removeItem('a3_refresh_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth_session_expired'));
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
export default api;
