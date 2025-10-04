import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
  test('відображається з label', () => {
    render(<Input label="Ім'я користувача" />);
    expect(screen.getByText("Ім'я користувача")).toBeInTheDocument();
  });

  test('відображає placeholder', () => {
    render(<Input placeholder="Введіть текст..." />);
    expect(screen.getByPlaceholderText('Введіть текст...')).toBeInTheDocument();
  });

  test('викликає onChange при введенні тексту', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalled();
  });

  test('відображає error message', () => {
    render(<Input error="Це поле обов'язкове" />);
    expect(screen.getByText("Це поле обов'язкове")).toBeInTheDocument();
  });

  test('показує required зірочку коли required=true', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('підтримує різні типи input', () => {
    const { container, rerender } = render(<Input type="email" />);
    let input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  test('передає value правильно', () => {
    render(<Input value="test" onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test');
  });

  test('застосовує error стилі', () => {
    const { container } = render(<Input error="Error" />);
    const input = container.querySelector('input');
    expect(input?.className).toContain('border-red-500');
  });
});
