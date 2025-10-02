import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getPeerByUsername, deletePeer, disablePeer, enablePeer, renewPeer, updatePeerPublicKey } from '@/lib/routeros/wireguard';
import { isValidPublicKey } from '@/lib/wireguard/keygen';
import { ApiResponse } from '@/types';
import { jsonResponse, getErrorMessage } from '@/lib/api-helpers';

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
 * Update peer (enable/disable/renew/update-key) (admin only)
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

    const { username } = await params;
    const body = await request.json();
    const { action, publicKey } = body;

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
      case 'update-key':
        if (!publicKey || !isValidPublicKey(publicKey)) {
          return jsonResponse.badRequest('Valid public key is required');
        }
        await updatePeerPublicKey(username, publicKey);
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
