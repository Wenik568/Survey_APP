import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('відображається з правильним текстом', () => {
    render(<Button>Натисни мене</Button>);
    expect(screen.getByText('Натисни мене')).toBeInTheDocument();
  });

  test('викликає onClick при натисканні', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Клік</Button>);

    fireEvent.click(screen.getByText('Клік'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disabled кнопка не кликабельна', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const button = screen.getByText('Disabled');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('відображає loader коли isLoading=true', () => {
    render(<Button isLoading>Завантаження</Button>);
    expect(screen.getByText('Завантаження...')).toBeInTheDocument();
    // Перевіряємо що кнопка disabled
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('застосовує правильні варіанти стилів', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByText('Primary');
    expect(button.className).toContain('from-primary-600');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByText('Danger');
    expect(button.className).toContain('from-red-500');

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByText('Secondary');
    expect(button.className).toContain('from-gray-500');
  });

  test('застосовує правильні розміри', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByText('Small');
    expect(button.className).toContain('px-4 py-2');

    rerender(<Button size="md">Medium</Button>);
    button = screen.getByText('Medium');
    expect(button.className).toContain('px-6 py-3');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByText('Large');
    expect(button.className).toContain('px-8 py-4');
  });

  test('передає додаткові HTML атрибути', () => {
    render(<Button data-testid="custom-button" aria-label="Custom">Test</Button>);
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom');
  });
});
