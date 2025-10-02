import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername } from '@/lib/routeros/wireguard';
import { buildConfigFile } from '@/lib/wireguard/config-builder';
import { generateQRCode } from '@/lib/wireguard/qrcode';
import { WireGuardConfig, ApiResponse } from '@/types';
import { jsonResponse, getServerPublicKeyOrFallback, buildConfigWithDefaults } from '@/lib/api-helpers';

/**
 * GET /api/config/qr
 * Generate QR code for WireGuard configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = (session.user as any).username;

    // Get peer
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return jsonResponse.notFound('No configuration found');
    }

    // Build configuration
    const serverPublicKey = await getServerPublicKeyOrFallback();

    const config: WireGuardConfig = {
      username,
      ...buildConfigWithDefaults({}, peer.allowedAddress, serverPublicKey),
    };

    const configFile = buildConfigFile(config);
    const qrCode = await generateQRCode(configFile);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { qrCode },
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return jsonResponse.error('Failed to generate QR code');
  }
}
