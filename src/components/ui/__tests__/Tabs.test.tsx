import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from '../Tabs';

const tabs = [
  { id: 'call', label: 'Call' },
  { id: 'notes', label: 'Notes' },
  { id: 'info', label: 'Info' },
];

describe('Tabs', () => {
  it('renders a labelled tablist and marks the active tab selected', () => {
    render(<Tabs tabs={tabs} activeId="notes" onChange={() => {}} aria-label="Task views" />);
    expect(screen.getByRole('tablist', { name: 'Task views' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Call' })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange with the tab id when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="call" onChange={onChange} aria-label="Task views" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Info' }));
    expect(onChange).toHaveBeenCalledWith('info');
  });
});
