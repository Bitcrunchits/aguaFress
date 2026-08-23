import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '../shared/components/Spinner';

describe('Spinner', () => {
  it('renders spinner element', () => {
    render(<Spinner />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'Cargando');
  });

  it('renders with sm size', () => {
    render(<Spinner size="sm" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with md size (default)', () => {
    render(<Spinner size="md" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with lg size', () => {
    render(<Spinner size="lg" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
