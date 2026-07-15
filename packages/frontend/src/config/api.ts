import axios from 'axios';

// Apunta directamente al puerto del Gateway (3000)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';[cite: 1]

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjuntar automáticamente el JWT obtenido tras el Login
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aguaFress_token');[cite: 1]
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;[cite: 1]
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para redireccionar al Login si el JWT expira (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('aguaFress_token');[cite: 1]
      localStorage.removeItem('aguaFress_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);