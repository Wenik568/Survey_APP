import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal Component', () => {
  test('не відображається коли isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  test('відображається коли isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('відображає title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Title">
        Content
      </Modal>
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  test('викликає onClose при натисканні на backdrop', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        Content
      </Modal>
    );

    // Клікаємо на backdrop (перший div з класом fixed)
    const backdrop = container.querySelector('.fixed');
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('викликає onClose при натисканні кнопки закриття', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        Content
      </Modal>
    );

    // Кнопка закриття - це button з SVG
    const closeButton = container.querySelector('button');
    fireEvent.click(closeButton!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('не закривається при кліку на контент модалки', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        <div data-testid="modal-content">Content</div>
      </Modal>
    );

    const content = screen.getByTestId('modal-content');
    fireEvent.click(content);

    expect(handleClose).not.toHaveBeenCalled();
  });
});
