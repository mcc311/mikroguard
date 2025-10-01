import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';

/**
 * GET /api/config/my
 * Get current user's WireGuard configuration
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
    const peer = await getPeerByUsername(username);

    if (!peer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No configuration found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peer,
    });
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}
