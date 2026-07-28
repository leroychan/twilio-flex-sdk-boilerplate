import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { ChannelBadge } from '../ChannelBadge';

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('ChannelBadge', () => {
  it('renders the translated channel label', () => {
    render(wrap(<ChannelBadge channel="voice" />));
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });

  it('renders the WhatsApp brand glyph for whatsapp', () => {
    const { container } = render(wrap(<ChannelBadge channel="whatsapp" />));
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    // The brand glyph is an <svg role="img">, distinct from lucide's aria-hidden svgs.
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('falls back to the generic label for an unknown channel', () => {
    render(wrap(<ChannelBadge channel="carrier-pigeon" />));
    expect(screen.getByText('Message')).toBeInTheDocument();
  });
});
