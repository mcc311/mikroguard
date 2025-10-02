import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, deletePeer } from '@/lib/routeros/wireguard';
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
        { status: 200 }
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

/**
 * DELETE /api/config/my
 * Delete current user's WireGuard configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const username = (session.user as any).username;

    // Check if user has a config
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No configuration found' },
        { status: 404 }
      );
    }

    // Delete the peer
    await deletePeer(username);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Configuration deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
