/** Caller identity distilled from a task's routing attributes. */
export interface TaskContact {
  /** Display name, when the routing attributes carry one. */
  name: string | null;
  /** Caller number or address (phone, SIP, or `client:` handle). */
  phone: string | null;
}

// Twilio task attributes vary by channel and Studio flow; these are the common
// aliases seen across voice/messaging tasks. First non-empty string wins.
const NAME_KEYS = ['name', 'customerName', 'customer_name', 'friendlyName', 'from_name'];
const PHONE_KEYS = ['from', 'caller', 'customerAddress', 'customer_address', 'phone'];

function firstString(attributes: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

/**
 * Derive the caller's name and number from a task's attributes for display in
 * the incoming/live surfaces. Keeps the lookup permissive (many attribute
 * shapes) but strictly string-typed, so a nested object or number never leaks
 * into the UI as `[object Object]`.
 */
export function resolveTaskContact(
  attributes: Record<string, unknown> | null | undefined,
): TaskContact {
  if (!attributes) return { name: null, phone: null };
  return {
    name: firstString(attributes, NAME_KEYS),
    phone: firstString(attributes, PHONE_KEYS),
  };
}
