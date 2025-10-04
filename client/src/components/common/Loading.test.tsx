import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from './Loading';

describe('Loading Component', () => {
  test('відображається з текстом за замовчуванням', () => {
    render(<Loading />);
    expect(screen.getByText('Завантаження')).toBeInTheDocument();
  });

  test('відображає кастомний текст', () => {
    render(<Loading text="Зачекайте..." />);
    expect(screen.getByText('Зачекайте...')).toBeInTheDocument();
  });

  test('не відображає текст коли text=""', () => {
    const { container } = render(<Loading text="" />);
    const paragraph = container.querySelector('p');
    expect(paragraph).not.toBeInTheDocument();
  });

  test('застосовує правильні розміри', () => {
    const { container, rerender } = render(<Loading size="sm" />);
    let spinners = container.querySelectorAll('div[class*="w-"]');
    expect(spinners[1].className).toContain('w-8 h-8');

    rerender(<Loading size="md" />);
    spinners = container.querySelectorAll('div[class*="w-"]');
    expect(spinners[1].className).toContain('w-12 h-12');

    rerender(<Loading size="lg" />);
    spinners = container.querySelectorAll('div[class*="w-"]');
    expect(spinners[1].className).toContain('w-16 h-16');
  });

  test('має анімацію обертання', () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('має два кільця для ефекту завантаження', () => {
    const { container } = render(<Loading />);
    const rings = container.querySelectorAll('.rounded-full');
    expect(rings.length).toBe(2);
  });
});
