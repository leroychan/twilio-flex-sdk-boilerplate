import { describe, it, expect, vi, beforeEach } from 'vitest';

const execute = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => ({ execute }) }));
vi.mock('@twilio/flex-sdk/actions/Voice', () => ({
  StartOutboundCall: class { constructor(public to: string, public opts?: unknown) {} },
  HoldVoiceParticipant: class { constructor(public t: string, public p: string) {} },
  UnholdVoiceParticipant: class { constructor(public t: string, public p: string) {} },
  KickVoiceParticipant: class { constructor(public t: string, public p: string) {} },
  AddExternalVoiceParticipant: class { constructor(public t: string, public to: string) {} },
  EndVoiceCallForAll: class { constructor(public t: string) {} },
  StartVoiceTaskTransfer: class { constructor(public t: string, public target: string, public mode: string) {} },
  CancelVoiceTaskTransfer: class { constructor(public t: string) {} },
  GetCallByTask: class { constructor(public t: string) {} },
}));

import * as V from '../Voice';

beforeEach(() => execute.mockReset());

describe('Voice action wrappers', () => {
  it('startOutboundCall returns the call sid', async () => {
    execute.mockResolvedValue({ callSid: 'CA1' });
    const out = await V.startOutboundCall('+15551234567');
    expect(out.callSid).toBe('CA1');
    expect(execute).toHaveBeenCalledOnce();
  });

  it('holdParticipant executes a HoldVoiceParticipant action', async () => {
    execute.mockResolvedValue(undefined);
    await V.holdParticipant('WT1', 'PA1');
    expect(execute).toHaveBeenCalledOnce();
  });

  it('getCallByTask returns the executed result', async () => {
    execute.mockResolvedValue({ callSid: 'CA1', status: 'in-progress' });
    const out = await V.getCallByTask('WT1');
    expect(out?.status).toBe('in-progress');
  });

  // Real FlexSdkErrors are Error instances carrying a numeric `code`, which normalizeFlexError
  // stringifies. Kept last and consumed via `.then(onResolve, onReject)` with a one-shot
  // rejecting mock: awaiting a persistent throwing/rejecting vi.fn() leaves a rejected-promise
  // trace that vitest v4 surfaces on a *following* test's tick; this form avoids that artifact.
  it('normalizes errors on failure', async () => {
    execute.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('boom'), { code: 500, severity: 'error' })),
    );
    const caught = await V.endCallForAll('WT1').then(
      () => null,
      (err) => err,
    );
    expect(caught).toEqual({ code: '500', severity: 'error', message: 'boom' });
  });
});
