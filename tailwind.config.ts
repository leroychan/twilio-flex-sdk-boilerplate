import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        brand: 'var(--color-brand)',
        primary: { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)' },
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
        red: { 50:'var(--red-50)',100:'var(--red-100)',200:'var(--red-200)',300:'var(--red-300)',400:'var(--red-400)',500:'var(--red-500)',600:'var(--red-600)',700:'var(--red-700)',800:'var(--red-800)',900:'var(--red-900)' },
        blue: { 50:'var(--blue-50)',100:'var(--blue-100)',200:'var(--blue-200)',300:'var(--blue-300)',400:'var(--blue-400)',500:'var(--blue-500)',600:'var(--blue-600)',700:'var(--blue-700)',800:'var(--blue-800)',900:'var(--blue-900)' },
        neutral: { 50:'var(--neutral-50)',100:'var(--neutral-100)',200:'var(--neutral-200)',300:'var(--neutral-300)',400:'var(--neutral-400)',500:'var(--neutral-500)',600:'var(--neutral-600)',700:'var(--neutral-700)',800:'var(--neutral-800)',900:'var(--neutral-900)' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Source Sans Pro', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['var(--font-text)', 'Source Sans Pro', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
