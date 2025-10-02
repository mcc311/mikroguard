import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername } from '@/lib/routeros/wireguard';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';
import { getServerPublicKeyOrFallback } from '@/lib/routeros/wireguard';
import { buildConfigWithDefaults } from '@/lib/wireguard/config-builder';

/**
 * POST /api/config/customize
 * Generate custom configuration with user-specified settings
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

    // Parse request body for custom configuration
    const body = await request.json();

    // Get server public key
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults(body, existingPeer.allowedAddress, serverPublicKey),
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
    console.error('Failed to generate custom config:', error);
    return jsonResponse.error(error instanceof Error ? error.message : 'Failed to generate configuration');
  }
}
