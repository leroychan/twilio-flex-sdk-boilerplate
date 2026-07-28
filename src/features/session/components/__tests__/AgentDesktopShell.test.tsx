import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';
import { loadMessages } from '@/i18n/loadMessages';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// Keep the SDK boundary out of the shell test — render children directly.
vi.mock('@/lib/flex/provider', () => ({
  FlexClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AgentDesktopShell } from '../AgentDesktopShell';

const messages = loadMessages('en');

// A stand-in SDK worker that satisfies the presence/task event bridges (they
// call worker.activities/reservations/on/off) so mounting the shell won't throw.
const fakeWorker = (attributes: Record<string, unknown>) =>
  ({
    attributes,
    sid: 'WK-test',
    activities: new Map(),
    activity: undefined,
    reservations: new Map(),
    on: vi.fn(),
    off: vi.fn(),
  }) as never;
function renderShell() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AgentDesktopShell />
    </NextIntlClientProvider>,
  );
}

describe('AgentDesktopShell', () => {
  beforeEach(() => {
    useFlexStore.setState({
      token: null,
      worker: null,
      connectionState: 'disconnected',
      hasHydrated: true,
      call: { ...INITIAL_CALL },
      tasks: [],
      activeTaskSid: null,
    });
    replace.mockReset();
    // QueuesView polls /api/queue-stats on mount when shown; keep it deterministic.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: false }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const acceptedVoiceTask = {
    reservationSid: 'WR1',
    taskSid: 'WT1',
    taskChannelUniqueName: 'voice',
    attributes: {},
    status: 'accepted' as const,
  };

  const pendingVoiceTask = {
    reservationSid: 'WR0',
    taskSid: 'WT0',
    taskChannelUniqueName: 'voice',
    attributes: { from: '+15623197825' },
    status: 'pending' as const,
  };

  it('redirects to /login when there is no token', async () => {
    renderShell();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('renders the desktop when a token is present', () => {
    useFlexStore.setState({ token: 'tok-1' });
    renderShell();
    expect(screen.getByTestId('agent-desktop')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('hides the call panel when there is no active call', () => {
    useFlexStore.setState({ token: 'tok-1', call: { ...INITIAL_CALL, status: 'idle' } });
    renderShell();
    expect(screen.queryByRole('button', { name: 'Hang up' })).toBeNull();
  });

  it('shows the call panel when the selected voice task is connected', () => {
    useFlexStore.setState({
      token: 'tok-1',
      tasks: [acceptedVoiceTask],
      activeTaskSid: 'WT1',
      call: { ...INITIAL_CALL, status: 'connected', taskSid: 'WT1', callSid: 'CA1' },
    });
    renderShell();
    expect(screen.getByRole('button', { name: 'Hang up' })).toBeInTheDocument();
  });

  it('shows a connecting placeholder for an accepted voice task before the call connects', () => {
    useFlexStore.setState({
      token: 'tok-1',
      tasks: [acceptedVoiceTask],
      activeTaskSid: 'WT1',
      call: { ...INITIAL_CALL, status: 'idle' },
    });
    renderShell();
    expect(screen.queryByRole('button', { name: 'Hang up' })).toBeNull();
    // TaskWorkspace shows a spinner in the body and a "Connecting" status badge in the header.
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('shows the incoming accept/reject surface for a selected pending voice task', () => {
    useFlexStore.setState({
      token: 'tok-1',
      tasks: [pendingVoiceTask],
      activeTaskSid: 'WT0',
      call: { ...INITIAL_CALL, status: 'idle' },
    });
    renderShell();
    // The formatted caller number now appears on both the task card and the
    // center incoming panel, so assert it renders at least once.
    expect(screen.getAllByText('+1 562-319-7825').length).toBeGreaterThanOrEqual(1);
    // Accept/Reject appear on both the task card and the incoming panel.
    expect(screen.getAllByRole('button', { name: 'Accept' }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('button', { name: 'Reject' }).length).toBeGreaterThanOrEqual(2);
  });

  it('hides the rail Teams entry for a non-supervisor worker', () => {
    useFlexStore.setState({ token: 'tok-1', worker: fakeWorker({ roles: ['agent'] }) });
    renderShell();
    expect(screen.queryByRole('button', { name: 'Teams' })).toBeNull();
  });

  it('offers the rail Teams entry for a supervisor worker', () => {
    useFlexStore.setState({ token: 'tok-1', worker: fakeWorker({ roles: ['supervisor'] }) });
    renderShell();
    expect(screen.getByRole('button', { name: 'Teams' })).toBeInTheDocument();
  });

  it('renders the icon rail and switches to Queues Stats', async () => {
    useFlexStore.setState({ token: 'tok-1' });
    renderShell();
    const railQueues = screen.getByRole('button', { name: 'Queues Stats' });
    await userEvent.click(railQueues);
    // QueuesView (unconfigured in test — fetch mocked to { configured:false }) shows its title.
    expect(await screen.findByText('Queues Stats')).toBeInTheDocument();
  });

  it('does not redirect before the store has rehydrated, even with no token', async () => {
    useFlexStore.setState({ token: null, hasHydrated: false });
    const { container } = renderShell();
    // Nothing rendered and no redirect while we wait for rehydration.
    expect(container).toBeEmptyDOMElement();
    // Give any (unwanted) effects a chance to fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(replace).not.toHaveBeenCalled();
  });

  it('exposes the dial affordance as the rail Dialpad button (not a header button)', () => {
    useFlexStore.setState({ token: 'tok-1' });
    renderShell();
    expect(screen.getByRole('button', { name: 'Dialpad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dial' })).toBeNull();
  });
});
