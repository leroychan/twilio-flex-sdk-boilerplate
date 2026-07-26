import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../registry';
import type { PluginStoreAccessor } from '../types';
import { exampleCrmPlugin } from '../example';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('exampleCrmPlugin', () => {
  it('has a well-formed manifest', () => {
    expect(exampleCrmPlugin.id).toBe('example');
    expect(exampleCrmPlugin.i18nNamespace).toBe('example');
    expect(typeof exampleCrmPlugin.register).toBe('function');
  });

  it('contributes a task-panel when registered', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(exampleCrmPlugin);
    const panels = r.getContributions('task-panel');
    expect(panels.map((p) => p.id)).toContain('example.task-panel');
  });
});
