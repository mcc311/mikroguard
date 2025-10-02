import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAllPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * GET /api/admin/peers
 * Get all WireGuard peers (admin only)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const isAdmin = session.user.isAdmin;
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const peers = await getAllPeers();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peers,
    });
  } catch (error) {
    console.error('Failed to get peers:', error);
    return jsonResponse.error('Failed to get peers');
  }
}
