/**
 * WireGuard public key validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a WireGuard public key format
 * @param key - The public key to validate
 * @returns ValidationResult with isValid boolean and optional error message
 */
export function validateWireGuardPublicKey(key: string): ValidationResult {
  const trimmedKey = key.trim();

  // Check if empty
  if (!trimmedKey) {
    return { isValid: false, error: 'Public key is required' };
  }

  // Check length
  if (trimmedKey.length !== 44) {
    return { isValid: false, error: 'Public key must be exactly 44 characters long' };
  }

  // Check if ends with '='
  if (!trimmedKey.endsWith('=')) {
    return { isValid: false, error: 'Public key must end with "="' };
  }

  // Check base64 format (alphanumeric + / + + and ends with =)
  const base64Regex = /^[A-Za-z0-9+/]{43}=$/;
  if (!base64Regex.test(trimmedKey)) {
    return { isValid: false, error: 'Public key contains invalid characters' };
  }

  return { isValid: true };
}
