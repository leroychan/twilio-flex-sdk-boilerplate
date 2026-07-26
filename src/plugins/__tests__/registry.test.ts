import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../registry';
import type { PluginManifest, PluginStoreAccessor } from '../types';

const fakeStore: PluginStoreAccessor = {
  getState: () => ({ session: {}, tasks: {} }),
  subscribe: () => () => {},
};

function panelManifest(id: string, order?: number): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    register(host) {
      host.contributeTaskPanel({ id: 'panel', order, component: () => null });
    },
  };
}

describe('PluginRegistry', () => {
  it('exposes a registered manifest', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    expect(r.registered.map((m) => m.id)).toEqual(['a']);
  });

  it('retrieves contributions by slot with plugin-scoped ids', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    const items = r.getContributions('task-panel');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('a.panel');
  });

  it('returns nothing for an empty slot', () => {
    const r = new PluginRegistry(fakeStore);
    expect(r.getContributions('nav-item')).toHaveLength(0);
  });

  it('sorts contributions by order ascending', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a', 2));
    r.register(panelManifest('b', 1));
    expect(r.getContributions('task-panel').map((c) => c.id)).toEqual(['b.panel', 'a.panel']);
  });

  it('rejects a duplicate plugin id', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    expect(() => r.register(panelManifest('a'))).toThrow(/already registered/);
  });

  it('gives plugins read-only store access via the host', () => {
    const r = new PluginRegistry(fakeStore);
    let seen: unknown;
    r.register({
      id: 'reader',
      name: 'reader',
      version: '1.0.0',
      register(host) {
        seen = Object.keys(host.store.getState());
      },
    });
    expect(seen).toEqual(['session', 'tasks']);
  });
});
