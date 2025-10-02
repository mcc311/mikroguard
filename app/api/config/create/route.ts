import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createPeer, getPeerByUsername, getNextAvailableIP } from '@/lib/routeros/wireguard';
import { generateKeyPair, isValidPublicKey } from '@/lib/wireguard/keygen';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';
import { jsonResponse, getServerPublicKeyOrFallback, buildConfigWithDefaults } from '@/lib/api-helpers';

/**
 * POST /api/config/create
 * Create new WireGuard configuration for current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = (session.user as any).username;

    // Check if user already has a config
    const existingPeer = await getPeerByUsername(username);
    if (existingPeer) {
      return jsonResponse.badRequest('Configuration already exists. Use renew instead.');
    }

    // Parse request body for custom configuration
    const body = await request.json().catch(() => ({}));
    const { publicKey: clientPublicKey, ...customConfig } = body;

    // Generate keys if not provided
    let publicKey: string;
    let privateKey: string;

    if (clientPublicKey && isValidPublicKey(clientPublicKey)) {
      publicKey = clientPublicKey;
      privateKey = ''; // Client has their own private key
    } else {
      const keyPair = generateKeyPair();
      privateKey = keyPair.privateKey;
      // For production, you'd need proper Curve25519 implementation
      // For now, we require client to provide their public key
      if (!clientPublicKey) {
        return jsonResponse.badRequest('Public key is required');
      }
      publicKey = clientPublicKey;
    }

    // Get next available IP
    const allowedAddress = await getNextAvailableIP();
    const address = allowedAddress; // Same as allowed address for peer

    // Create peer in RouterOS
    await createPeer(username, publicKey, allowedAddress);

    // Build configuration
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults(customConfig, address, serverPublicKey),
      privateKey: privateKey || buildConfigWithDefaults(customConfig, address, serverPublicKey).privateKey,
    };

    const configFile = buildConfigFile(config);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        config,
        configFile,
      },
    });
  } catch (error) {
    console.error('Failed to create config:', error);
    return jsonResponse.error(error instanceof Error ? error.message : 'Failed to create configuration');
  }
}
