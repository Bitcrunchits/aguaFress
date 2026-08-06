import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../shared/components/Card';

describe('Card', () => {
  it('renders children content', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders Card.Header', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('renders Card.Body', () => {
    render(
      <Card>
        <Card.Body>Body content</Card.Body>
      </Card>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders Card.Footer', () => {
    render(
      <Card>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders full card with all compound components', () => {
    render(
      <Card>
        <Card.Header>Title</Card.Header>
        <Card.Body>Description</Card.Body>
        <Card.Footer>Actions</Card.Footer>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('accepts className', () => {
    render(<Card className="custom-class">Styled</Card>);
    expect(screen.getByText('Styled')).toBeInTheDocument();
  });
});
