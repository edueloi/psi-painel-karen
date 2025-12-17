import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3013',
});

// Adiciona um interceptor de requisição para incluir o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
