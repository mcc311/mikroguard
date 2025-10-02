import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { renewPeer, getPeerByUsername } from '@/lib/routeros/wireguard';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';
import { jsonResponse, getErrorMessage } from '@/lib/api-helpers';
import { getServerPublicKeyOrFallback } from '@/lib/routeros/wireguard';
import { buildConfigWithDefaults } from '@/lib/wireguard/config-builder';

/**
 * POST /api/config/renew
 * Renew WireGuard configuration for current user
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
      return jsonResponse.notFound('No configuration found. Create one first.');
    }

    // Renew the peer (update TTL and enable if disabled)
    await renewPeer(username);

    // Parse request body for custom configuration
    const body = await request.json().catch(() => ({}));

    // Build configuration
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults(body, existingPeer.allowedAddress, serverPublicKey),
    };

    const configFile = buildConfigFile(config);

    // Get updated peer info
    const updatedPeer = await getPeerByUsername(username);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        peer: updatedPeer,
        config,
        configFile,
      },
    });
  } catch (error) {
    console.error('Failed to renew config:', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to renew configuration'));
  }
}
