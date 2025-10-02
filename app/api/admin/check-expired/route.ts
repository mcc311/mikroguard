import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { checkExpiredPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';

/**
 * POST /api/admin/check-expired
 * Check and disable expired peers (admin only)
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
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
