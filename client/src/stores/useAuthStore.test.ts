import { describe, test, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import type { User } from '../types';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  test('початковий стан', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  test('setUser встановлює користувача і isAuthenticated', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: '2024-01-01',
    };

    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();

    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  test('setUser з null скидає автентифікацію', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: '2024-01-01',
    };

    // Спочатку встановлюємо користувача
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Потім скидаємо
    useAuthStore.getState().setUser(null);
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  test('setLoading змінює статус завантаження', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);

    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  test('logout скидає всі дані користувача', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: '2024-01-01',
    };

    // Встановлюємо користувача
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Виходимо
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  test('стан зберігається між викликами', () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: '2024-01-01',
    };

    useAuthStore.getState().setUser(mockUser);

    // Отримуємо стан ще раз - він має бути той самий
    const state1 = useAuthStore.getState();
    const state2 = useAuthStore.getState();

    expect(state1.user).toEqual(state2.user);
    expect(state1.isAuthenticated).toBe(state2.isAuthenticated);
  });
});
