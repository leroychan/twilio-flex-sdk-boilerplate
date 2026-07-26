import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  it('renders a labelled toggle button', async () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    const btn = await screen.findByRole('button', { name: 'toggle theme' });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn); // does not throw
  });
});
