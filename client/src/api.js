import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
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
