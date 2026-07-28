import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MessageList } from '../MessageList';
import type { ConversationMessage } from '@/store/slices/conversations';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

const base = { author: 'c', dateCreated: 'n', isMine: false };

describe('MessageList', () => {
  it('renders a plain text message', () => {
    const messages: ConversationMessage[] = [{ ...base, sid: 'M1', body: 'hello there' }];
    render(wrap(<MessageList messages={messages} />));
    expect(screen.getByText('hello there')).toBeInTheDocument();
  });

  it('renders an email message as a subject line and sandboxed iframe', () => {
    const messages: ConversationMessage[] = [
      { ...base, sid: 'M2', body: '', subject: 'Your order', htmlUrl: 'https://media.example/body.html' },
    ];
    render(wrap(<MessageList messages={messages} />));
    expect(screen.getByText(/Your order/)).toBeInTheDocument();
    const iframe = screen.getByTitle('Your order') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('https://media.example/body.html');
    expect(iframe.getAttribute('sandbox')).toBe('');
  });
});
