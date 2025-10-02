import crypto from 'crypto';
import { WIREGUARD_PROTOCOL } from '@/lib/constants';

/**
 * Generate WireGuard key pair
 * Returns base64-encoded private and public keys
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  // Generate random bytes for private key
  const privateKeyBuffer = crypto.randomBytes(WIREGUARD_PROTOCOL.KEY_BUFFER_LENGTH);

  // Clamp the private key as per WireGuard spec (Curve25519 requirement)
  privateKeyBuffer[0] &= WIREGUARD_PROTOCOL.CLAMP_MASK_0;
  privateKeyBuffer[31] &= WIREGUARD_PROTOCOL.CLAMP_MASK_31_AND;
  privateKeyBuffer[31] |= WIREGUARD_PROTOCOL.CLAMP_MASK_31_OR;

  const privateKey = privateKeyBuffer.toString('base64');

  // Generate public key using Curve25519
  // Note: In production, you should use a proper Curve25519 library
  // For now, we'll expect the client to provide their public key
  // or use wg CLI tool on server side

  return {
    privateKey,
    publicKey: '', // Will be computed by client or wg-tools
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

/**
 * Note: For production use, consider using:
 * 1. @stablelib/x25519 for proper Curve25519 key generation
 * 2. Or execute 'wg' CLI tool if available on server
 * 3. Or let clients generate their own keys
 */
