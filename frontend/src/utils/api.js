import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:8002',
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    console.log('API request interceptor:', config.url);
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Attaching token to request');
    }
    return config;
  },
  (error) => {
    console.log('API request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => {
    console.log('API response interceptor:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.log('API response error:', error);
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