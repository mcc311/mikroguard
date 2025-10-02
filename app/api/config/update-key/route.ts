import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, updatePeerPublicKey, getServerPublicKey } from '@/lib/routeros/wireguard';
import { isValidPublicKey } from '@/lib/wireguard/keygen';
import { buildConfigFile, getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';

/**
 * POST /api/config/update-key
 * Update public key for current user's WireGuard configuration
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

    // Parse request body
    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || !isValidPublicKey(publicKey)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Valid public key is required' },
        { status: 400 }
      );
    }

    // Update public key in RouterOS
    await updatePeerPublicKey(username, publicKey);

    // Build new configuration file
    const template = getDefaultTemplate();
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: 'YOUR_PRIVATE_KEY_HERE',
      address: existingPeer.allowedAddress,
      dns: template.dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: template.allowedIPs || [],
      endpoint: template.endpoint || '',
      persistentKeepalive: template.persistentKeepalive || 25,
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
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update public key' },
      { status: 500 }
    );
  }
}
