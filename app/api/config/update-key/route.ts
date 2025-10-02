import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, updatePeerPublicKey } from '@/lib/routeros/wireguard';
import { isValidPublicKey } from '@/lib/wireguard/keygen';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';
import { jsonResponse, getErrorMessage } from '@/lib/api-helpers';
import { getServerPublicKeyOrFallback } from '@/lib/routeros/wireguard';
import { buildConfigWithDefaults } from '@/lib/wireguard/config-builder';

/**
 * POST /api/config/update-key
 * Update public key for current user's WireGuard configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = session.user.username!;

    // Check if user has a config
    const existingPeer = await getPeerByUsername(username);
    if (!existingPeer) {
      return jsonResponse.notFound('No configuration found. Please create one first.');
    }

    // Parse request body
    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || !isValidPublicKey(publicKey)) {
      return jsonResponse.badRequest('Valid public key is required');
    }

    // Update public key in RouterOS
    await updatePeerPublicKey(username, publicKey);

    // Build new configuration file
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults({}, existingPeer.allowedAddress, serverPublicKey),
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
    console.error('Failed to update public key:', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to update public key'));
  }
}
