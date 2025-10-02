import { WIREGUARD_PROTOCOL } from '@/lib/constants';

/**
 * Validate WireGuard public key format
 *
 * Checks that the key is:
 * 1. Exactly 44 characters (base64 encoded 32-byte key)
 * 2. Valid base64 that decodes to 32 bytes
 */
export function isValidPublicKey(key: string): boolean {
  if (!key || key.length !== WIREGUARD_PROTOCOL.PUBLIC_KEY_LENGTH) {
    return false;
  }

  try {
    const buffer = Buffer.from(key, 'base64');
    return buffer.length === WIREGUARD_PROTOCOL.KEY_BUFFER_LENGTH;
  } catch {
    return false;
  }
}
