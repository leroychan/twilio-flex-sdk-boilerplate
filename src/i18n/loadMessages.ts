import fs from 'node:fs';
import path from 'node:path';

export type Messages = Record<string, Record<string, unknown>>;

export interface LoadMessagesOptions {
  /** Directory that contains one folder per locale of core namespace files. */
  coreDir?: string;
  /** Directory that contains one folder per feature. */
  featuresDir?: string;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

/**
 * Builds the next-intl messages object for a locale by merging:
 *  - core namespaces: <coreDir>/<locale>/<namespace>.json  (namespace = filename)
 *  - feature namespaces: <featuresDir>/<feature>/messages/<locale>.json (namespace = feature dir)
 * Missing directories contribute no keys and never throw, so feature parts can
 * add their own catalogs with zero edits to this file.
 */
export function loadMessages(locale: string, options: LoadMessagesOptions = {}): Messages {
  const coreDir = options.coreDir ?? path.join(process.cwd(), 'src/i18n/messages');
  const featuresDir = options.featuresDir ?? path.join(process.cwd(), 'src/features');
  const messages: Messages = {};

  const localeCoreDir = path.join(coreDir, locale);
  if (fs.existsSync(localeCoreDir)) {
    for (const file of fs.readdirSync(localeCoreDir)) {
      if (file.endsWith('.json')) {
        const namespace = path.basename(file, '.json');
        messages[namespace] = readJson(path.join(localeCoreDir, file));
      }
    }
  }

  if (fs.existsSync(featuresDir)) {
    for (const feature of fs.readdirSync(featuresDir)) {
      const file = path.join(featuresDir, feature, 'messages', `${locale}.json`);
      if (fs.existsSync(file)) {
        messages[feature] = readJson(file);
      }
    }
  }

  return messages;
}
