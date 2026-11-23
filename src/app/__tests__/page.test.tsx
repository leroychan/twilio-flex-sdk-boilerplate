import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
// The header pulls in theme/locale providers — irrelevant to the landing content.
vi.mock('@/components/layout/AppHeader', () => ({ AppHeader: () => null }));

import Home from '../page';

describe('Home', () => {
  it('links to the login page', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'signIn' })).toHaveAttribute('href', '/login');
  });

  it('renders the getting-started steps in order', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'gettingStarted.title' })).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    ['install', 'configure', 'run', 'signIn'].forEach((step, i) => {
      expect(steps[i]).toHaveTextContent(`gettingStarted.steps.${step}.title`);
    });
  });
});
