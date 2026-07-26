import type { PluginManifest } from '../types';
import { ExampleTaskPanel } from './TaskPanel';

/** Disabled example plugin — the template for building your own (see plugins/README.md). */
export const exampleCrmPlugin: PluginManifest = {
  id: 'example',
  name: 'Example CRM Plugin',
  version: '0.0.0',
  i18nNamespace: 'example',
  register(host) {
    host.contributeTaskPanel({
      id: 'task-panel',
      title: 'Example',
      order: 100,
      component: ExampleTaskPanel,
    });
  },
};
