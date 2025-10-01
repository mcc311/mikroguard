import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, getServerPublicKey } from '@/lib/routeros/wireguard';
import { buildConfigFile, getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { WireGuardConfig } from '@/types';

/**
 * GET /api/config/download
 * Download WireGuard configuration file
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const username = (session.user as any).username;

    // Get peer
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return new NextResponse('No configuration found', { status: 404 });
    }

    // Get query parameters for customization
    const { searchParams } = new URL(request.url);
    const dns = searchParams.get('dns');
    const endpoint = searchParams.get('endpoint');

    // Build configuration
    const template = getDefaultTemplate();
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: 'YOUR_PRIVATE_KEY_HERE',
      address: peer.allowedAddress,
      dns: dns || template.dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: template.allowedIPs || [],
      endpoint: endpoint || template.endpoint || '',
      persistentKeepalive: template.persistentKeepalive || 25,
    };

    const configFile = buildConfigFile(config);

    // Return as downloadable file
    return new NextResponse(configFile, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${username}-wireguard.conf"`,
      },
    });
  } catch (error) {
    console.error('Failed to download config:', error);
    return new NextResponse('Failed to download configuration', { status: 500 });
  }
}
