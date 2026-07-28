/**
 * Format a phone value for display, mirroring the reference desktop's rule:
 * North-American numbers become `+1 NNN-NNN-NNNN` (or `NNN-NNN-NNNN` when the
 * country code is absent). Anything that isn't a recognizable 10/11-digit NANP
 * number — international numbers, SIP/client addresses, empty input — is
 * returned unchanged so we never mangle a value we don't understand.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}
