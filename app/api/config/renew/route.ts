import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { renewPeer, getPeerByUsername, getServerPublicKey } from '@/lib/routeros/wireguard';
import { buildConfigFile, getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';

/**
 * POST /api/config/renew
 * Renew WireGuard configuration for current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = (session.user as any).username;

    // Check if user has a config
    const existingPeer = await getPeerByUsername(username);
    if (!existingPeer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No configuration found. Create one first.' },
        { status: 404 }
      );
    }

    // Renew the peer (update TTL and enable if disabled)
    await renewPeer(username);

    // Parse request body for custom configuration
    const body = await request.json().catch(() => ({}));

    // Build configuration
    const template = getDefaultTemplate();
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: 'YOUR_PRIVATE_KEY_HERE', // User should use their existing private key
      address: existingPeer.allowedAddress,
      dns: body.dns || template.dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: body.allowedIPs || template.allowedIPs || [],
      endpoint: body.endpoint || template.endpoint || '',
      persistentKeepalive: body.persistentKeepalive || template.persistentKeepalive || 25,
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
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to renew configuration' },
      { status: 500 }
    );
  }
}
