import localFont from 'next/font/local';

// Real Twilio Sans (v2.000), self-hosted from src/theme/fonts/*.woff2.
// Text = body/UI, Display = headings, Mono = code/numeric. Roman weights only
// (italics omitted to keep the bundle lean); add more .woff2 + entries as needed.

const text = localFont({
  variable: '--font-text',
  display: 'swap',
  fallback: ['Source Sans Pro', 'Inter', 'system-ui', 'sans-serif'],
  src: [
    { path: './fonts/TwilioSansText-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/TwilioSansText-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/TwilioSansText-Semibold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/TwilioSansText-Bold.woff2', weight: '700', style: 'normal' },
  ],
});

const display = localFont({
  variable: '--font-display',
  display: 'swap',
  fallback: ['Source Sans Pro', 'Inter', 'system-ui', 'sans-serif'],
  src: [
    { path: './fonts/TwilioSansDisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/TwilioSansDisplay-Semibold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/TwilioSansDisplay-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/TwilioSansDisplay-Extrabold.woff2', weight: '800', style: 'normal' },
  ],
});

const mono = localFont({
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
  src: [
    { path: './fonts/TwilioSansMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/TwilioSansMono-Medium.woff2', weight: '500', style: 'normal' },
  ],
});

export const fontVariables = `${text.variable} ${display.variable} ${mono.variable}`;
