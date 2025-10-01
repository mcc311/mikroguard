import crypto from 'crypto';

/**
 * Generate WireGuard key pair
 * Returns base64-encoded private and public keys
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  // Generate 32 random bytes for private key
  const privateKeyBuffer = crypto.randomBytes(32);

  // Clamp the private key as per WireGuard spec
  privateKeyBuffer[0] &= 248;
  privateKeyBuffer[31] &= 127;
  privateKeyBuffer[31] |= 64;

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
  if (!key || key.length !== 44) {
    return false;
  }

  try {
    const buffer = Buffer.from(key, 'base64');
    return buffer.length === 32;
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
