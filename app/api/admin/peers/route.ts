import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAllPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';

/**
 * GET /api/admin/peers
 * Get all WireGuard peers (admin only)
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

    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const peers = await getAllPeers();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peers,
    });
  } catch (error) {
    console.error('Failed to get peers:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to get peers' },
      { status: 500 }
    );
  }
}
