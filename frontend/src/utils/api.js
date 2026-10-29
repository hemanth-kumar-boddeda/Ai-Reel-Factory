import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
});

// The request interceptor attaches the JWT token.
//
// It does not log: every request used to write two lines to the console, so
// a single page load produced about thirty of them and the real errors were
// lost in the noise.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// The response interceptor handles a 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the error is 401 (Unauthorized), redirect to login page
    if (error.response && error.response.status === 401) {
      // Remove the expired token
      localStorage.removeItem('accessToken');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
