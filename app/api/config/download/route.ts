import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername } from '@/lib/routeros/wireguard';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { WireGuardConfig } from '@/types';
import { getServerPublicKeyOrFallback, buildConfigWithDefaults } from '@/lib/api-helpers';
import { HTTP_STATUS, FILE_DOWNLOAD } from '@/lib/constants';

/**
 * GET /api/config/download
 * Download WireGuard configuration file
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const username = (session.user as any).username;

    // Get peer
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return new NextResponse('No configuration found', { status: HTTP_STATUS.NOT_FOUND });
    }

    // Get query parameters for customization
    const { searchParams } = new URL(request.url);
    const customConfig = {
      dns: searchParams.get('dns') || undefined,
      endpoint: searchParams.get('endpoint') || undefined,
    };

    // Build configuration
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults(customConfig, peer.allowedAddress, serverPublicKey),
    };

    const configFile = buildConfigFile(config);

    // Return as downloadable file
    return new NextResponse(configFile, {
      headers: {
        'Content-Type': FILE_DOWNLOAD.CONFIG_MIME_TYPE,
        'Content-Disposition': `attachment; filename="${username}-wireguard${FILE_DOWNLOAD.CONFIG_FILE_EXTENSION}"`,
      },
    });
  } catch (error) {
    console.error('Failed to download config:', error);
    return new NextResponse('Failed to download configuration', { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
