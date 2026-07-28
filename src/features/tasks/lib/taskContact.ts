/** Caller identity distilled from a task's routing attributes. */
export interface TaskContact {
  /** Display name, when the routing attributes carry one. */
  name: string | null;
  /** Caller number or address (phone, SIP, or `client:` handle). */
  phone: string | null;
}

// Twilio task attributes vary by channel and Studio flow, and casing/separators
// differ across integrations (`customerName`, `customer_name`, `friendlyName`).
// Keys are compared after canonicalization (lowercase, alphanumerics only), so
// every permutation collapses to one token.
const NAME_KEYS = new Set([
  'name',
  'fullname',
  'displayname',
  'customername',
  'contactname',
  'friendlyname',
  'fromname',
]);
const FIRST_NAME_KEYS = new Set(['firstname', 'first', 'givenname', 'forename', 'fname']);
const LAST_NAME_KEYS = new Set(['lastname', 'last', 'familyname', 'surname', 'lname']);
const PHONE_KEYS = new Set(['from', 'caller', 'customeraddress', 'customerphone', 'phone', 'msisdn']);

// Nested blocks that legitimately carry customer identity — webchat pre-engagement
// data and CRM/customer objects. We descend only into these (not arbitrary nested
// objects like `conference`/`conversations`) so a stray nested `name` can't win.
const CONTAINER_KEYS = new Set([
  'preengagementdata',
  'preengagement',
  'customers',
  'customer',
  'contact',
  'contacts',
  'profile',
  'traits',
  'customerprofile',
]);

function canon(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Twilio resource SIDs (FXxxxx…, CHxxxx…, WTxxxx…, USxxxx…): two letters + 32 hex.
// Never a human-readable name or dialable number, so we never surface one.
function looksLikeSid(value: string): boolean {
  return /^[A-Za-z]{2}[0-9a-f]{32}$/.test(value.trim());
}

/**
 * Breadth-first search of the attributes tree for the first non-empty string
 * whose canonicalized key is in `keys` and isn't a Twilio SID. Top-level keys
 * win over nested ones; descends (up to `maxDepth`) only into recognized
 * customer containers, covering webchat's nested `pre_engagement_data`.
 */
function findString(
  attributes: Record<string, unknown>,
  keys: Set<string>,
  maxDepth = 2,
): string | null {
  let level: Record<string, unknown>[] = [attributes];
  for (let depth = 0; depth <= maxDepth && level.length > 0; depth++) {
    const next: Record<string, unknown>[] = [];
    for (const obj of level) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed && keys.has(canon(key)) && !looksLikeSid(trimmed)) return trimmed;
        } else if (value && typeof value === 'object' && !Array.isArray(value) && CONTAINER_KEYS.has(canon(key))) {
          next.push(value as Record<string, unknown>);
        }
      }
    }
    level = next;
  }
  return null;
}

/**
 * Derive the caller's name and number from a task's attributes for display in
 * the incoming/live surfaces. Permissive about attribute shape (flat or nested,
 * any casing) but strictly string-typed, and never returns a Twilio SID — so a
 * webchat customer's `FX…` identity shows a resolved name, not the raw SID.
 */
export function resolveTaskContact(
  attributes: Record<string, unknown> | null | undefined,
): TaskContact {
  if (!attributes) return { name: null, phone: null };
  const first = findString(attributes, FIRST_NAME_KEYS);
  const last = findString(attributes, LAST_NAME_KEYS);
  const full = findString(attributes, NAME_KEYS);
  const name = first && last ? `${first} ${last}` : (full ?? first ?? last ?? null);
  return {
    name,
    phone: findString(attributes, PHONE_KEYS),
  };
}
