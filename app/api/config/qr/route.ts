import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, getServerPublicKey } from '@/lib/routeros/wireguard';
import { buildConfigFile, getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { generateQRCode } from '@/lib/wireguard/qrcode';
import { WireGuardConfig, ApiResponse } from '@/types';

/**
 * GET /api/config/qr
 * Generate QR code for WireGuard configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = (session.user as any).username;

    // Get peer
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No configuration found' },
        { status: 404 }
      );
    }

    // Build configuration
    const template = getDefaultTemplate();
    const serverPublicKey = await getServerPublicKey().catch(() => process.env.WG_SERVER_PUBLIC_KEY || '');

    const config: WireGuardConfig = {
      username,
      privateKey: 'YOUR_PRIVATE_KEY_HERE',
      address: peer.allowedAddress,
      dns: template.dns || '1.1.1.1',
      publicKey: serverPublicKey,
      allowedIPs: template.allowedIPs || [],
      endpoint: template.endpoint || '',
      persistentKeepalive: template.persistentKeepalive || 25,
    };

    const configFile = buildConfigFile(config);
    const qrCode = await generateQRCode(configFile);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { qrCode },
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
