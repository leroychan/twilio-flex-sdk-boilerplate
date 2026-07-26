import { describe, it, expect } from 'vitest';
import type { PluginStoreAccessor } from '../types';
import { enabledPlugins, initPlugins } from '../index';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('plugin loader', () => {
  it('ships with zero enabled plugins by default', () => {
    expect(enabledPlugins).toHaveLength(0);
  });

  it('initPlugins returns a registry with no contributions by default', () => {
    const r = initPlugins(fakeStore);
    expect(r.registered).toHaveLength(0);
    expect(r.getContributions('task-panel')).toHaveLength(0);
  });
});
