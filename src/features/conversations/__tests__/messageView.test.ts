import { describe, it, expect } from 'vitest';
import { toMessageView } from '../messageView';

describe('toMessageView', () => {
  const date = new Date('2026-07-27T03:00:00.000Z');

  it('maps an outbound message (author === self)', () => {
    const v = toMessageView({ sid: 'IM1', author: 'agent@x.com', body: 'hi', dateCreated: date }, 'agent@x.com');
    expect(v).toEqual({
      sid: 'IM1',
      author: 'agent@x.com',
      body: 'hi',
      dateCreated: '2026-07-27T03:00:00.000Z',
      isMine: true,
    });
  });

  it('maps an inbound message (different author)', () => {
    const v = toMessageView({ sid: 'IM2', author: 'cust', body: 'hello', dateCreated: date }, 'agent@x.com');
    expect(v.isMine).toBe(false);
    expect(v.author).toBe('cust');
  });

  it('labels an anonymous FX author', () => {
    const fx = 'FX' + '0'.repeat(32); // length 34
    const v = toMessageView({ sid: 'IM3', author: fx, body: 'x', dateCreated: date }, 'agent@x.com');
    expect(v.author).toBe('Anonymous');
    expect(v.isMine).toBe(false);
  });

  it('handles string dates and missing fields', () => {
    const v = toMessageView({ index: 5, dateCreated: '2026-07-27T03:00:00.000Z' }, 'me');
    expect(v.body).toBe('');
    expect(v.dateCreated).toBe('2026-07-27T03:00:00.000Z');
    expect(v.isMine).toBe(false);
  });
});
