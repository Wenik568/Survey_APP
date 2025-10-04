import api from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
  ApiResponse,
} from '../types';

export const authService = {
  // Реєстрація
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', credentials);
    if (response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    return response.data;
  },

  // Логін
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    if (response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    return response.data;
  },

  // Вихід
  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
    localStorage.removeItem('accessToken');
  },

  // Отримання профілю
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>('/api/auth/profile');
    return response.data.data.user;
  },

  // Оновлення токена
  async refreshToken(): Promise<string> {
    const response = await api.post<ApiResponse<{ accessToken: string }>>(
      '/api/auth/refresh'
    );
    const token = response.data.data.accessToken;
    localStorage.setItem('accessToken', token);
    return token;
  },

  // Скидання пароля (запит)
  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/api/auth/forgot-password', { email });
    return response.data;
  },

  // Скидання пароля (підтвердження)
  async resetPassword(token: string, password: string, confirmPassword: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/api/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return response.data;
  },

  // Перевірка валідності токена
  async validateToken(): Promise<boolean> {
    try {
      await api.get('/api/auth/validate');
      return true;
    } catch {
      return false;
    }
  },
};
