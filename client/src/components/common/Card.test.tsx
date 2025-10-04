import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';

describe('Card Component', () => {
  test('відображає дочірні елементи', () => {
    render(
      <Card>
        <h1>Test Title</h1>
        <p>Test Content</p>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('застосовує додаткові класи', () => {
    const { container } = render(
      <Card className="custom-class">Content</Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  test('викликає onClick при натисканні', () => {
    const handleClick = vi.fn();
    const { container } = render(<Card onClick={handleClick}>Clickable Card</Card>);

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('застосовує hover стилі коли hover=true', () => {
    const { container } = render(<Card hover>Hover Card</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('hover:-translate-y-1');
  });

  test('не застосовує hover стилі за замовчуванням', () => {
    const { container } = render(<Card>Normal Card</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('hover:-translate-y-1');
  });

  test('передає HTML атрибути через rest props', () => {
    render(<Card data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toBeInTheDocument();
  });
});
