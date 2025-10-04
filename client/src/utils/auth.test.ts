import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { getGoogleAuthUrl } from './auth';

describe('auth utils', () => {
  const originalEnv = import.meta.env.VITE_API_URL;

  afterEach(() => {
    // Restore original env
    import.meta.env.VITE_API_URL = originalEnv;
  });

  describe('getGoogleAuthUrl', () => {
    test('повертає правильний URL з VITE_API_URL', () => {
      import.meta.env.VITE_API_URL = 'https://api.example.com';
      const url = getGoogleAuthUrl();
      expect(url).toBe('https://api.example.com/auth/google');
    });

    test('використовує localhost якщо VITE_API_URL не встановлено', () => {
      import.meta.env.VITE_API_URL = '';
      const url = getGoogleAuthUrl();
      expect(url).toBe('http://localhost:3000/auth/google');
    });

    test('правильно формує URL з різними базовими URL', () => {
      const testCases = [
        { apiUrl: 'http://localhost:5000', expected: 'http://localhost:5000/auth/google' },
        { apiUrl: 'https://prod.example.com', expected: 'https://prod.example.com/auth/google' },
        { apiUrl: 'http://192.168.1.1:3000', expected: 'http://192.168.1.1:3000/auth/google' },
      ];

      testCases.forEach(({ apiUrl, expected }) => {
        import.meta.env.VITE_API_URL = apiUrl;
        expect(getGoogleAuthUrl()).toBe(expected);
      });
    });
  });
});
