/**
 * KuroStudio Unique Identifier Utilities
 *
 * Generates collision-resistant, sortable, prefixed identifiers.
 * Format: {prefix}_{timestamp_hex}_{random_hex}
 */

export function generateId(prefix = 'kuro'): string {
  const timestamp = Date.now().toString(36);
  // Using Web Crypto or Math.random fallback
  let randomHex = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    randomHex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  }
  return `${prefix}_${timestamp}_${randomHex}`;
}

export function isIdValid(id: string, expectedPrefix?: string): boolean {
  if (typeof id !== 'string' || id.length < 8) return false;
  if (expectedPrefix) {
    return id.startsWith(`${expectedPrefix}_`);
  }
  return true;
}
