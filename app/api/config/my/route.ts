import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, deletePeer } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * GET /api/config/my
 * Get current user's WireGuard configuration
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = session.user.username!;
    const peer = await getPeerByUsername(username);

    if (!peer) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No configuration found' },
        { status: HTTP_STATUS.OK }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peer,
    });
  } catch (error) {
    console.error('Failed to get config:', error);
    return jsonResponse.error('Failed to get configuration');
  }
}

/**
 * DELETE /api/config/my
 * Delete current user's WireGuard configuration
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = session.user.username!;

    // Check if user has a config
    const peer = await getPeerByUsername(username);
    if (!peer) {
      return jsonResponse.notFound('No configuration found');
    }

    // Delete the peer
    await deletePeer(username);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Configuration deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return jsonResponse.error(error instanceof Error ? error.message : 'Failed to delete configuration');
  }
}
