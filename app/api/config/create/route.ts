import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createPeer, getPeerByUsername, getNextAvailableIP, getServerPublicKey } from '@/lib/routeros/wireguard';
import { generateKeyPair, isValidPublicKey } from '@/lib/wireguard/keygen';
import { buildConfigFile, getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { ApiResponse, WireGuardConfig } from '@/types';

/**
 * POST /api/config/create
 * Create new WireGuard configuration for current user
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

    // Check if user already has a config
    const existingPeer = await getPeerByUsername(username);
    if (existingPeer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Configuration already exists. Use renew instead.' },
        { status: 400 }
      );
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
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Public key is required' },
          { status: 400 }
        );
      }
      publicKey = clientPublicKey;
    }

    // Get next available IP
    const allowedAddress = await getNextAvailableIP();
    const address = allowedAddress; // Same as allowed address for peer

    // Create peer in RouterOS
    await createPeer(username, publicKey, allowedAddress);

    // Build configuration
    const template = getDefaultTemplate();
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: privateKey || 'YOUR_PRIVATE_KEY_HERE',
      address,
      dns: customConfig.dns || template.dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: customConfig.allowedIPs || template.allowedIPs || [],
      endpoint: customConfig.endpoint || template.endpoint || '',
      persistentKeepalive: customConfig.persistentKeepalive || template.persistentKeepalive || 25,
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
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
