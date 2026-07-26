import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code: string): Promise<string[]> {
  const results = await eslint.lintText(code, {
    filePath: 'src/__lint_fixtures__/Sample.tsx',
  });
  return (results[0]?.messages ?? [])
    .map((m) => m.ruleId)
    .filter((id): id is string => id != null);
}

describe('react/jsx-no-literals enforcement', () => {
  it('flags untranslated literal JSX text', async () => {
    const ids = await ruleIds('export const A = () => <div>Untranslated</div>;\n');
    expect(ids).toContain('react/jsx-no-literals');
  });

  it('accepts JSX whose text comes from a t() call', async () => {
    const ids = await ruleIds(
      'export const A = ({ t }: { t: (k: string) => string }) => <div>{t("app.title")}</div>;\n',
    );
    expect(ids).not.toContain('react/jsx-no-literals');
  });
});
