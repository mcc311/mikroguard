import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, getServerPublicKey } from '@/lib/routeros/wireguard';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';

/**
 * POST /api/config/customize
 * Generate custom configuration with user-specified settings
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
        { success: false, error: 'No configuration found. Please create one first.' },
        { status: 404 }
      );
    }

    // Parse request body for custom configuration
    const body = await request.json();
    const { dns, allowedIPs, endpoint, persistentKeepalive } = body;

    // Get server public key
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: 'YOUR_PRIVATE_KEY_HERE',
      address: existingPeer.allowedAddress,
      dns: dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: allowedIPs || ['0.0.0.0/0'],
      endpoint: endpoint || '',
      persistentKeepalive: persistentKeepalive || 25,
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
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate configuration' },
      { status: 500 }
    );
  }
}
