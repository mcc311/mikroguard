import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { checkExpiredPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';

/**
 * POST /api/admin/check-expired
 * Check and disable expired peers (admin only)
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

    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const expiredPeers = await checkExpiredPeers();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        expiredCount: expiredPeers.length,
        expiredPeers,
      },
    });
  } catch (error) {
    console.error('Failed to check expired peers:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to check expired peers' },
      { status: 500 }
    );
  }
}
