import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import api from './api';

// Mock API module
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    test('успішна реєстрація', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'test-token',
            user: { id: '1', email: 'test@test.com', name: 'Test' },
          },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const credentials = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await authService.register(credentials);

      expect(api.post).toHaveBeenCalledWith('/api/auth/register', credentials);
      expect(localStorage.getItem('accessToken')).toBe('test-token');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('login', () => {
    test('успішний логін', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'login-token',
            user: { id: '1', email: 'test@test.com', name: 'Test' },
          },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const credentials = { email: 'test@test.com', password: 'password123' };
      const result = await authService.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(localStorage.getItem('accessToken')).toBe('login-token');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('logout', () => {
    test('видаляє токен з localStorage', async () => {
      localStorage.setItem('accessToken', 'test-token');
      vi.mocked(api.post).mockResolvedValue({});

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('getProfile', () => {
    test('повертає профіль користувача', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
      const mockResponse = {
        data: {
          success: true,
          data: { user: mockUser },
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await authService.getProfile();

      expect(api.get).toHaveBeenCalledWith('/api/auth/profile');
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    test('оновлює токен', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { accessToken: 'new-token' },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(api.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(localStorage.getItem('accessToken')).toBe('new-token');
      expect(result).toBe('new-token');
    });
  });

  describe('forgotPassword', () => {
    test('надсилає запит на скидання пароля', async () => {
      const mockResponse = {
        data: { success: true, message: 'Email sent' },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.forgotPassword('test@test.com');

      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'test@test.com',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resetPassword', () => {
    test('скидає пароль з токеном', async () => {
      const mockResponse = {
        data: { success: true, message: 'Password reset' },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.resetPassword(
        'reset-token',
        'newpass123',
        'newpass123'
      );

      expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token',
        password: 'newpass123',
        confirmPassword: 'newpass123',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('validateToken', () => {
    test('повертає true якщо токен валідний', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { success: true } });

      const result = await authService.validateToken();

      expect(api.get).toHaveBeenCalledWith('/api/auth/validate');
      expect(result).toBe(true);
    });

    test('повертає false якщо токен невалідний', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Invalid token'));

      const result = await authService.validateToken();

      expect(result).toBe(false);
    });
  });
});
