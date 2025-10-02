import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, deletePeer, disablePeer, enablePeer, renewPeer } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse, getErrorMessage } from '@/lib/api-helpers';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * GET /api/admin/peers/[username]
 * Get specific peer by username (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
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

    const { username } = await params;
    const peer = await getPeerByUsername(username);

    if (!peer) {
      return jsonResponse.notFound('Peer not found');
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peer,
    });
  } catch (error) {
    console.error('Failed to get peer:', error);
    return jsonResponse.error('Failed to get peer');
  }
}

/**
 * DELETE /api/admin/peers/[username]
 * Delete peer (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
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

    const { username } = await params;
    await deletePeer(username);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Peer deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete peer:', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to delete peer'));
  }
}

/**
 * PATCH /api/admin/peers/[username]
 * Update peer status (enable/disable/renew) (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
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

    const { username } = await params;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'enable':
        await enablePeer(username);
        break;
      case 'disable':
        await disablePeer(username);
        break;
      case 'renew':
        await renewPeer(username);
        break;
      default:
        return jsonResponse.badRequest('Invalid action');
    }

    const updatedPeer = await getPeerByUsername(username);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedPeer,
    });
  } catch (error) {
    console.error('Failed to update peer:', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to update peer'));
  }
}
