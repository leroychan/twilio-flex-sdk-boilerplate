import { Source_Sans_3, Inter } from 'next/font/google';

// Open fallback faces (SIL OFL). Licensed Twilio Sans / BuffaloBF can be added later via
// next/font/local pointing at self-hosted woff2 under src/theme/fonts/ — see README.
const text = Source_Sans_3({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
const display = Inter({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-display', display: 'swap' });

export const fontVariables = `${text.variable} ${display.variable}`;
