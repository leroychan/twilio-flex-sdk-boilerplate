import { describe, it, expect } from 'vitest';
import { resolveConversationName } from '../conversationName';

const FX = 'FX' + '0'.repeat(32); // anonymous conversation-user SID, length 34

describe('resolveConversationName', () => {
  it('prefers a real name from task attributes over an FX conversation friendlyName', () => {
    expect(resolveConversationName(FX, { name: 'Jane Doe' }, 'CH1')).toBe('Jane Doe');
  });

  it('resolves names carried under alternate attribute keys', () => {
    expect(resolveConversationName(FX, { customerName: 'Bob' }, 'CH1')).toBe('Bob');
    expect(resolveConversationName(FX, { from_name: 'Sam' }, 'CH1')).toBe('Sam');
  });

  it('uses a real conversation friendlyName when attributes carry no name', () => {
    expect(resolveConversationName('Support Chat', {}, 'CH1')).toBe('Support Chat');
  });

  it('resolves the webchat name from the conversation attributes pre_engagement_data', () => {
    // The task attributes carry only the FX identity; the real name lives on the
    // Conversation resource under pre_engagement_data.friendlyName.
    const convAttrs = { pre_engagement_data: { friendlyName: 'Leroy', email: 'leroy@example.com' } };
    expect(resolveConversationName(FX, { customerName: FX }, 'CH1', convAttrs)).toBe('Leroy');
  });

  it('prefers the conversation pre_engagement name over a task-attribute name', () => {
    const convAttrs = { pre_engagement_data: { friendlyName: 'Leroy' } };
    expect(resolveConversationName(FX, { name: 'Task Name' }, 'CH1', convAttrs)).toBe('Leroy');
  });

  it('falls back to task-attribute name when conversation attributes carry no name', () => {
    expect(resolveConversationName(FX, { name: 'Jane' }, 'CH1', { pre_engagement_data: {} })).toBe('Jane');
  });

  it('falls back to the FX friendlyName only when no name can be resolved', () => {
    expect(resolveConversationName(FX, {}, 'CH1')).toBe(FX);
  });

  it('falls back to the conversation sid when there is no friendlyName at all', () => {
    expect(resolveConversationName(null, {}, 'CH1')).toBe('CH1');
    expect(resolveConversationName(undefined, null, 'CH1')).toBe('CH1');
  });

  it('ignores blank/whitespace friendlyNames', () => {
    expect(resolveConversationName('   ', { name: 'Jane' }, 'CH1')).toBe('Jane');
    expect(resolveConversationName('   ', {}, 'CH1')).toBe('CH1');
  });
});
