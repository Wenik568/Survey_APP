import { describe, test, expect } from 'vitest';

// Функції валідації (створимо їх якщо не існують)
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateSurveyTitle = (title: string): boolean => {
  return title.trim().length > 0 && title.trim().length <= 200;
};

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('повертає true для валідного email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('name+tag@gmail.com')).toBe(true);
    });

    test('повертає false для невалідного email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('повертає true для паролю >= 6 символів', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('securePass!')).toBe(true);
    });

    test('повертає false для паролю < 6 символів', () => {
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('abc')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('validateSurveyTitle', () => {
    test('повертає true для валідної назви', () => {
      expect(validateSurveyTitle('Моє опитування')).toBe(true);
      expect(validateSurveyTitle('Survey 2024')).toBe(true);
    });

    test('повертає false для порожньої назви', () => {
      expect(validateSurveyTitle('')).toBe(false);
      expect(validateSurveyTitle('   ')).toBe(false);
    });

    test('повертає false для надто довгої назви', () => {
      const longTitle = 'a'.repeat(201);
      expect(validateSurveyTitle(longTitle)).toBe(false);
    });
  });
});
