import crypto from 'crypto';
import { WIREGUARD_PROTOCOL } from '@/lib/constants';

/**
 * ⚠️ WARNING: INCOMPLETE IMPLEMENTATION ⚠️
 *
 * Generate WireGuard key pair
 *
 * This function generates ONLY the private key.
 * The publicKey field is returned as an EMPTY STRING.
 *
 * This is NOT a complete implementation. To derive the public key
 * from the private key requires Curve25519 scalar multiplication,
 * which is not implemented here.
 *
 * Current usage: Clients must provide their own public key.
 *
 * For complete key generation, use one of:
 * 1. @stablelib/x25519 library
 * 2. Execute 'wg' CLI tool on server
 * 3. Let clients generate keys locally
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKeyBuffer = crypto.randomBytes(WIREGUARD_PROTOCOL.KEY_BUFFER_LENGTH);

  // Clamp the private key as per WireGuard spec (Curve25519 requirement)
  privateKeyBuffer[0] &= WIREGUARD_PROTOCOL.CLAMP_MASK_0;
  privateKeyBuffer[31] &= WIREGUARD_PROTOCOL.CLAMP_MASK_31_AND;
  privateKeyBuffer[31] |= WIREGUARD_PROTOCOL.CLAMP_MASK_31_OR;

  const privateKey = privateKeyBuffer.toString('base64');

  return {
    privateKey,
    publicKey: '', // NOT IMPLEMENTED - client must provide
  };
}

/**
 * Validate WireGuard public key format
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
