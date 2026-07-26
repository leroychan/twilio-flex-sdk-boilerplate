import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from '../Logo';

describe('Logo', () => {
  it('renders the Twilio logo with accessible alt text', () => {
    render(<Logo />);
    expect(screen.getByAltText('Twilio')).toBeInTheDocument();
  });
});
