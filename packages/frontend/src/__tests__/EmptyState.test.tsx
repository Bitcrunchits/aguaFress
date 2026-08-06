import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../shared/components/EmptyState';

describe('EmptyState', () => {
  it('renders default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<EmptyState message="No hay clientes" />);
    expect(screen.getByText('No hay clientes')).toBeInTheDocument();
  });

  it('does not render action button when action is not provided', () => {
    render(<EmptyState message="Vacío" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button with label when action is provided', () => {
    render(<EmptyState message="Vacío" action={{ label: 'Agregar', onClick: () => {} }} />);
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState message="Vacío" action={{ label: 'Crear', onClick }} />);
    await user.click(screen.getByRole('button', { name: /crear/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
