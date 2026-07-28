import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/flex/client', () => ({ getFlexClient: vi.fn() }));

import { getFlexClient } from '@/lib/flex/client';
import { resolveActiveVoiceCall } from '../resolveActiveCall';
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';
import { getActiveVoiceCall, getVoiceCallHandle, resetRegistry } from '@/lib/flex/registry';

const noSleep = () => Promise.resolve();

beforeEach(() => {
  resetRegistry();
  useFlexStore.setState({ call: { ...INITIAL_CALL }, tasks: [] });
  vi.mocked(getFlexClient).mockReset();
});

describe('resolveActiveVoiceCall', () => {
  it('no-ops without a live SDK client (stub/tests)', async () => {
    vi.mocked(getFlexClient).mockReturnValue(null as never);
    const getCall = vi.fn();
    await resolveActiveVoiceCall('WT1', { getCall, sleep: noSleep });
    expect(getCall).not.toHaveBeenCalled();
    expect(useFlexStore.getState().call.status).toBe('idle');
  });

  it('registers the resolved call and flips the store to connected with caller number', async () => {
    vi.mocked(getFlexClient).mockReturnValue({} as never);
    const disconnectHandlers: Array<() => void> = [];
    const vc = {
      call: {
        parameters: { From: '+15623197825', CallSid: 'CA1' },
        on: (e: string, cb: () => void) => {
          if (e === 'disconnect') disconnectHandlers.push(cb);
        },
        off: vi.fn(),
      },
    };
    const getCall = vi.fn().mockResolvedValue(vc);

    await resolveActiveVoiceCall('WT1', { getCall, sleep: noSleep, initialDelayMs: 0 });

    const call = useFlexStore.getState().call;
    expect(call.status).toBe('connected');
    expect(call.taskSid).toBe('WT1');
    expect(call.from).toBe('+15623197825');
    expect(call.callSid).toBe('CA1');
    expect(getActiveVoiceCall()).toBe(vc);
    expect(getVoiceCallHandle('WT1')).toBe(vc);

    // disconnect resets + clears the handle
    disconnectHandlers.forEach((h) => h());
    expect(useFlexStore.getState().call.status).toBe('idle');
    expect(getActiveVoiceCall()).toBeUndefined();
    expect(getVoiceCallHandle('WT1')).toBeUndefined();
  });

  it('prefers the task attributes caller number over the leg From parameter', async () => {
    vi.mocked(getFlexClient).mockReturnValue({} as never);
    // The connected call must show the customer's number from the task, not the
    // WebRTC leg's From (here a Twilio DID) that a conference leg reports.
    useFlexStore.setState({
      call: { ...INITIAL_CALL },
      tasks: [
        {
          reservationSid: 'WR1',
          taskSid: 'WT1',
          taskChannelUniqueName: 'voice',
          attributes: { from: '+15551234567' },
          status: 'accepted',
        },
      ],
    });
    const vc = {
      call: {
        parameters: { From: '+18885550000', CallSid: 'CA1' },
        on: () => {},
        off: vi.fn(),
      },
    };
    const getCall = vi.fn().mockResolvedValue(vc);

    await resolveActiveVoiceCall('WT1', { getCall, sleep: noSleep, initialDelayMs: 0 });

    const call = useFlexStore.getState().call;
    expect(call.status).toBe('connected');
    expect(call.from).toBe('+15551234567');
  });

  it('leaves the store idle when the call is live on another device', async () => {
    vi.mocked(getFlexClient).mockReturnValue({} as never);
    const getCall = vi.fn().mockRejectedValue(new Error('active on a different voice device'));
    await resolveActiveVoiceCall('WT1', { getCall, sleep: noSleep, initialDelayMs: 0, attempts: 2 });
    expect(useFlexStore.getState().call.status).toBe('idle');
    expect(getActiveVoiceCall()).toBeUndefined();
  });
});
