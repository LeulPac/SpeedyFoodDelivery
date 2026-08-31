import axios from 'axios';

const api = axios.create({
  // In dev: VITE_API_URL is empty → Vite proxy handles /api → localhost:5000
  // In production: VITE_API_URL = https://your-app.onrender.com
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
});

const getStoredToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');
export const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
