import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { checkExpiredPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * POST /api/admin/check-expired
 * Check and disable expired peers (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const isAdmin = (session.user as any).isAdmin;
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: HTTP_STATUS.FORBIDDEN }
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
    return jsonResponse.error('Failed to check expired peers');
  }
}
