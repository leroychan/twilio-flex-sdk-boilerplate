# Part 1 — Scaffold & Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable Next.js 15 + TypeScript app themed with the exact Twilio brand tokens, with light/dark switching, base UI primitives, the official Twilio logo, and a themed shell page.

**Architecture:** Next.js App Router with a `'use client'` theme provider (`next-themes`, class strategy). Brand values live once in `theme/tokens.css` as CSS variables consumed by a Tailwind theme that maps semantic names (`bg-surface`, `text-primary`, `bg-brand`) to those variables, so light/dark and any future re-brand touch one file. Fonts via `next/font/local` for the licensed Twilio faces with open fallbacks.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS v3, next-themes, Vitest + @testing-library/react, ESLint/Prettier.

## Global Constraints

- Next.js 15 App Router + TypeScript; strict mode on.
- All SDK-touching code (later parts) must sit behind `'use client'` + `ssr:false`; Part 1 introduces no SDK code.
- Styling = Tailwind CSS + custom Twilio brand tokens only. **No Twilio Paste.**
- Light AND dark themes are both first-class.
- Brand tokens must use the exact hex values from the spec §8 (copied verbatim in Task 3).
- Primary action color = Blue-500 `#1866EE`; brand/logo accent = Red `#F22F46`; destructive = Red-500 `#DD1020`.
- Fonts prefer Twilio Sans / BuffaloBF, but must degrade to Source Sans Pro → Inter → system-ui so the app runs legally with no licensed font files present.
- Every user-facing string will be translated in Part 2; in Part 1 keep copy in simple constants so Part 2 can extract them.

---

### Task 1: Initialize Next.js + TypeScript project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `next-env.d.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a working `next dev` app; `src/app/layout.tsx` exports default `RootLayout({children})`.

- [ ] **Step 1: Scaffold with the CLI (non-interactive)**

Run:
```bash
npx create-next-app@latest . --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --no-turbopack --use-npm --yes
```
Expected: project files created in the current directory (repo root). If the CLI refuses because the dir is non-empty, move `docs/` aside temporarily, scaffold, then restore.

- [ ] **Step 2: Pin Next to 15 and verify dev server boots**

Run:
```bash
npm pkg get dependencies.next dependencies.react
npm run dev &
sleep 6 && curl -sf http://localhost:3000 >/dev/null && echo "DEV OK"; kill %1
```
Expected: prints `DEV OK`.

- [ ] **Step 3: Enable strict TypeScript**

In `tsconfig.json` ensure `"strict": true` and `"noUncheckedIndexedAccess": true` under `compilerOptions`.

- [ ] **Step 4: Type-check passes**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 15 + TS + Tailwind app"
```

---

### Task 2: Add test tooling (Vitest + Testing Library)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (scripts: `test`, `test:run`)
- Create: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test:run` executes Vitest in jsdom; later parts add tests here.

- [ ] **Step 1: Install dev deps**

Run:
```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

- [ ] **Step 3: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write the smoke test `src/lib/__tests__/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('test tooling', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm run test:run`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "test: add Vitest + Testing Library"
```

---

### Task 3: Define Twilio brand tokens (CSS variables, light + dark)

**Files:**
- Create: `src/theme/tokens.css`
- Modify: `src/app/globals.css` (import tokens, set base body colors)

**Interfaces:**
- Produces: CSS variables consumed by Tailwind in Task 4. Semantic vars:
  `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`, `--color-text`,
  `--color-text-muted`, `--color-brand`, `--color-primary`, `--color-primary-hover`,
  `--color-danger`, `--color-success`, `--color-warning`, `--color-info`.
  Plus raw scale vars `--red-50..900`, `--blue-50..900`, `--neutral-50..900`.

- [ ] **Step 1: Write `src/theme/tokens.css` with the exact spec §8 values**

```css
:root {
  /* Raw brand scales (verbatim from spec §8) */
  --red-50:#FFF1F1; --red-100:#FFD6DC; --red-200:#FFA7AD; --red-300:#FF7681;
  --red-400:#F84050; --red-500:#DD1020; --red-600:#B20E22; --red-700:#890A1E;
  --red-800:#5D0A18; --red-900:#240206; --brand-red:#F22F46; --red-450:#EF223A;
  --blue-50:#E4F7FF; --blue-100:#A9EAFF; --blue-200:#3ACEFA; --blue-300:#0CAEE1;
  --blue-400:#0E8CDF; --blue-500:#1866EE; --blue-600:#1953B9; --blue-700:#0E3E92;
  --blue-800:#0B2A60; --blue-900:#000D25;
  --neutral-50:#F3F4F7; --neutral-100:#DDE0E6; --neutral-200:#BCBECC; --neutral-300:#99A2B0;
  --neutral-400:#7E879C; --neutral-500:#676E88; --neutral-600:#52567B; --neutral-700:#3F4062;
  --neutral-800:#282A48; --neutral-900:#000D25; --white:#FFFFFF;
  --green-success:#14804A; --amber-warning:#F0B429;

  /* Semantic — LIGHT theme */
  --color-bg: var(--neutral-50);
  --color-surface: var(--white);
  --color-surface-2: var(--neutral-50);
  --color-border: var(--neutral-100);
  --color-text: var(--neutral-900);
  --color-text-muted: var(--neutral-500);
  --color-brand: var(--brand-red);
  --color-primary: var(--blue-500);
  --color-primary-hover: var(--blue-600);
  --color-danger: var(--red-500);
  --color-success: var(--green-success);
  --color-warning: var(--amber-warning);
  --color-info: var(--blue-400);
}

.dark {
  --color-bg: var(--neutral-900);
  --color-surface: var(--neutral-800);
  --color-surface-2: var(--neutral-700);
  --color-border: var(--neutral-700);
  --color-text: var(--neutral-50);
  --color-text-muted: var(--neutral-300);
  --color-brand: var(--brand-red);
  --color-primary: var(--blue-300);
  --color-primary-hover: var(--blue-200);
  --color-danger: var(--red-400);
  --color-success: var(--green-success);
  --color-warning: var(--amber-warning);
  --color-info: var(--blue-300);
}
```

- [ ] **Step 2: Import tokens at top of `src/app/globals.css`**

Add as the FIRST line (before the Tailwind directives):
```css
@import "../theme/tokens.css";
```
Then ensure body uses the vars:
```css
body { background: var(--color-bg); color: var(--color-text); }
```

- [ ] **Step 3: Verify the app still builds**

Run: `npx next build`
Expected: build succeeds (compiled successfully).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(theme): add Twilio brand tokens (light + dark)"
```

---

### Task 4: Map tokens into Tailwind theme

**Files:**
- Modify: `tailwind.config.ts`

**Interfaces:**
- Produces: Tailwind utilities `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`,
  `text-text`, `text-muted`, `bg-brand`, `bg-primary`, `hover:bg-primary-hover`,
  `bg-danger`, `text-success`, plus `red/blue/neutral` numeric scales. `darkMode: 'class'`.

- [ ] **Step 1: Write `tailwind.config.ts`**

```ts
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
```

- [ ] **Step 2: Verify utilities resolve — build**

Run: `npx next build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(theme): map brand tokens into Tailwind"
```

---

### Task 5: Fonts + Twilio logo

**Files:**
- Create: `src/theme/fonts.ts`
- Create: `public/brand/twilio-logo.svg`
- Create: `src/components/ui/Logo.tsx`
- Create: `src/components/ui/__tests__/Logo.test.tsx`
- Modify: `src/app/layout.tsx` (apply font CSS variables to `<html>`)

**Interfaces:**
- Produces: `fonts` object exposing `--font-display/--font-text/--font-mono` class names;
  `Logo({className?})` React component rendering the Twilio SVG via `next/image` or inline.

- [ ] **Step 1: Download the official Twilio logo**

Run:
```bash
mkdir -p public/brand
curl -sfL "https://www.twilio.com/content/dam/twilio-com/core-assets/customer-logos/t-z/twilio.svg" -o public/brand/twilio-logo.svg
grep -q 'F22F46' public/brand/twilio-logo.svg && echo "LOGO OK"
```
Expected: prints `LOGO OK`.

- [ ] **Step 2: Write `src/theme/fonts.ts` (open fallbacks; licensed faces optional)**

Use `next/font/google` for the open fallback so the app runs with zero licensed files:
```ts
import { Source_Sans_3, Inter } from 'next/font/google';

// Open fallback faces (SIL OFL). Licensed Twilio Sans / BuffaloBF can be added later via
// next/font/local pointing at self-hosted woff2 under src/theme/fonts/ — see README.
const text = Source_Sans_3({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
const display = Inter({ subsets: ['latin'], weight: ['700','800','900'], variable: '--font-display', display: 'swap' });

export const fontVariables = `${text.variable} ${display.variable}`;
```
Note: `--font-mono` falls back to `ui-monospace` via Tailwind; no google mono needed.

- [ ] **Step 3: Apply fonts in `src/app/layout.tsx`**

Set `<html lang="en" className={`${fontVariables}`} suppressHydrationWarning>` and give `<body>` `className="font-sans"`.

- [ ] **Step 4: Write `src/components/ui/Logo.tsx`**

```tsx
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <Image src="/brand/twilio-logo.svg" alt="Twilio" width={110} height={40} className={className} priority />
  );
}
```

- [ ] **Step 5: Write the failing test `src/components/ui/__tests__/Logo.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from '../Logo';

describe('Logo', () => {
  it('renders the Twilio logo with accessible alt text', () => {
    render(<Logo />);
    expect(screen.getByAltText('Twilio')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:run -- Logo`
Expected: PASS (next/image renders an img with alt="Twilio").

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(brand): add Twilio logo + font setup"
```

---

### Task 6: Theme provider + toggle (light/dark)

**Files:**
- Create: `src/components/theme/ThemeProvider.tsx`
- Create: `src/components/theme/ThemeToggle.tsx`
- Create: `src/components/theme/__tests__/ThemeToggle.test.tsx`
- Modify: `src/app/layout.tsx` (wrap children in provider)

**Interfaces:**
- Consumes: `next-themes`.
- Produces: `ThemeProvider({children})`; `ThemeToggle()` button toggling `light`/`dark`,
  with `aria-label="toggle theme"` and `data-theme` reflecting the resolved theme.

- [ ] **Step 1: Install next-themes**

Run: `npm i next-themes`

- [ ] **Step 2: Write `ThemeProvider.tsx`**

```tsx
'use client';
import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
```

- [ ] **Step 3: Write `ThemeToggle.tsx`**

```tsx
'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;
  return (
    <button
      type="button"
      aria-label="toggle theme"
      data-theme={current}
      onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}
      className="rounded-md border border-border bg-surface px-3 py-2 text-text hover:bg-surface-2"
    >
      {current === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

- [ ] **Step 4: Wrap children in `layout.tsx`**

Inside `<body>`: `<ThemeProvider>{children}</ThemeProvider>`.

- [ ] **Step 5: Write the test `ThemeToggle.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  it('renders a labelled toggle button', async () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    const btn = await screen.findByRole('button', { name: 'toggle theme' });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn); // does not throw
  });
});
```

- [ ] **Step 6: Run test**

Run: `npm run test:run -- ThemeToggle`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(theme): add ThemeProvider + light/dark toggle"
```

---

### Task 7: Base UI primitives (Button, Card)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Produces:
  `Button({variant?: 'primary'|'secondary'|'danger'|'ghost', ...ButtonHTMLAttributes})`,
  `Card({children, className?})`.

- [ ] **Step 1: Write `Button.tsx`**

```tsx
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
};

export function Button({ variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Write `Card.tsx`**

```tsx
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface p-4 shadow-sm ${className}`}>{children}</div>;
}
```

- [ ] **Step 3: Write the failing test `Button.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders label and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('applies the danger variant class', () => {
    render(<Button variant="danger">X</Button>);
    expect(screen.getByRole('button', { name: 'X' }).className).toContain('bg-danger');
  });
});
```

- [ ] **Step 4: Run test**

Run: `npm run test:run -- Button`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): add Button + Card primitives"
```

---

### Task 8: Themed shell page (proves the whole stack)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/layout/AppHeader.tsx`

**Interfaces:**
- Consumes: `Logo`, `ThemeToggle`, `Button`, `Card`.
- Produces: `AppHeader()` rendering logo + theme toggle; home page renders header + a
  welcome card using brand tokens.

- [ ] **Step 1: Write `AppHeader.tsx`**

```tsx
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Logo />
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 2: Write `src/app/page.tsx`**

```tsx
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <AppHeader />
      <div className="mx-auto max-w-3xl p-8">
        <Card>
          <h1 className="font-display text-3xl font-extrabold">Twilio Flex SDK Boilerplate</h1>
          <p className="mt-2 text-muted">Next.js + TypeScript agent desktop foundation.</p>
          <div className="mt-4 flex gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build + dev render**

Run:
```bash
npx next build && (npm run dev & sleep 6; curl -sf http://localhost:3000 | grep -qi "Twilio Flex SDK Boilerplate" && echo "SHELL OK"; kill %1)
```
Expected: build succeeds and prints `SHELL OK`.

- [ ] **Step 4: Run full test + lint + type-check**

Run: `npm run test:run && npm run lint && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: themed app shell (header, logo, theme toggle, primitives)"
```

---

## Self-Review

**Spec coverage (Part 1 slice):** Next.js 15 + TS (T1) ✓ · Tailwind + custom tokens, no Paste (T3, T4) ✓ · exact brand hex (T3) ✓ · light/dark (T3, T6) ✓ · fonts with open fallback (T5) ✓ · official logo (T5) ✓ · base primitives + themed shell (T7, T8) ✓ · test tooling (T2) ✓. Deferred to later parts by design: i18n (Part 2), SDK/auth (Part 3+), plugins (Part 8).

**Placeholder scan:** No TBD/TODO; every code step contains full code. ✓

**Type consistency:** Semantic token names in Task 3 (`--color-primary`, `--color-primary-hover`, `--color-danger`, `--color-surface-2`, etc.) match their Tailwind mappings in Task 4 and usage in Tasks 6–8. `Button` variants (`primary|secondary|danger|ghost`) used consistently. `fontVariables` export (T5) matches `layout.tsx` usage. ✓

**Notes for executor:** if `create-next-app` refuses the non-empty dir, temporarily move `docs/` out, scaffold, then move it back before Task 1 Step 5.
