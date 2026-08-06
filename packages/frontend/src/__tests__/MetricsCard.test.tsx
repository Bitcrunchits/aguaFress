import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsCard } from '../features/vendedor/components/MetricsCard';

describe('MetricsCard', () => {
  it('renders title and value', () => {
    render(<MetricsCard title="Total Clientes" value="42" />);
    expect(screen.getByText('Total Clientes')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with teal variant', () => {
    render(<MetricsCard title="Clientes" value="10" variant="teal" />);
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders with coral variant', () => {
    render(<MetricsCard title="Pendientes" value="3" variant="coral" />);
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders with default variant when not specified', () => {
    render(<MetricsCard title="Total" value="99" />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('renders large value number', () => {
    render(<MetricsCard title="Clientes" value="1234" />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});
