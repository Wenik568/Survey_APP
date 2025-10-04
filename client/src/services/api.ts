import axios from 'axios';
import type { AxiosError } from 'axios';

// Базовий URL API (беремо з поточного сервера)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Створюємо axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Для cookies (refreshToken)
});

// Request interceptor - додаємо access token
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

// Response interceptor - обробка помилок і оновлення токена
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Якщо 401 (Unauthorized) і це не refresh запит
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Спробуємо оновити токен
        const response = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Повторюємо оригінальний запит з новим токеном
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Якщо refresh не вдався - перенаправляємо на login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Utility функції для обробки API відповідей
export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message;
    return message;
  }
  return 'Невідома помилка';
};
