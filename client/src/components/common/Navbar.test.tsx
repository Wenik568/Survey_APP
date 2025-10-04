import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuthStore } from '../../stores/useAuthStore';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    logout: vi.fn(),
  },
}));

// Mock useAuthStore
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({
      logout: vi.fn(),
    } as any);
  });

  test('відображає логотип та назву', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Система Опитувань')).toBeInTheDocument();
    expect(screen.getByText('Збирайте відгуки легко')).toBeInTheDocument();
  });

  test('відображає кнопку "Головна" за замовчуванням', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Головна/)).toBeInTheDocument();
  });

  test('відображає кастомну кнопку "Назад"', () => {
    render(
      <BrowserRouter>
        <Navbar showBackButton backTo="/test" backLabel="Повернутися" />
      </BrowserRouter>
    );

    expect(screen.getByText(/Повернутися/)).toBeInTheDocument();
  });

  test('не відображає кнопку дашборду коли showDashboard=false', () => {
    render(
      <BrowserRouter>
        <Navbar showDashboard={false} />
      </BrowserRouter>
    );

    expect(screen.queryByText(/Головна/)).not.toBeInTheDocument();
  });

  test('приховує кнопку виходу коли hideLogout=true', () => {
    render(
      <BrowserRouter>
        <Navbar hideLogout />
      </BrowserRouter>
    );

    expect(screen.queryByText(/Вийти/)).not.toBeInTheDocument();
  });

  test('відображає кнопку виходу за замовчуванням', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Вийти/)).toBeInTheDocument();
  });

  test('має липку позицію для навбару', () => {
    const { container } = render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('sticky');
    expect(nav?.className).toContain('top-0');
  });
});
