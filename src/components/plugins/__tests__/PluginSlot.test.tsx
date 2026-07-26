import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@/plugins/registry';
import type { PluginStoreAccessor } from '@/plugins/types';
import { PluginProvider } from '../PluginProvider';
import { PluginSlot } from '../PluginSlot';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('PluginSlot', () => {
  it('renders components contributed to its slot', () => {
    const registry = new PluginRegistry(fakeStore);
    registry.register({
      id: 'demo',
      name: 'demo',
      version: '1.0.0',
      register(host) {
        host.contributeTaskPanel({ id: 'hello', component: () => <div>hello plugin</div> });
      },
    });
    render(
      <PluginProvider registry={registry}>
        <PluginSlot name="task-panel" />
      </PluginProvider>,
    );
    expect(screen.getByText('hello plugin')).toBeInTheDocument();
  });

  it('renders nothing for a slot with no contributions', () => {
    const registry = new PluginRegistry(fakeStore);
    const { container } = render(
      <PluginProvider registry={registry}>
        <PluginSlot name="nav-item" />
      </PluginProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
