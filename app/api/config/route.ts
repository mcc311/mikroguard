import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import {
  getPeerByUsername,
  createPeer,
  deletePeer,
  renewPeer,
  updatePeerPublicKey,
  getNextAvailableIP,
} from '@/lib/routeros/wireguard';
import { isValidPublicKey } from '@/lib/wireguard/keygen';
import { ApiResponse } from '@/types';
import { jsonResponse, getErrorMessage } from '@/lib/api-helpers';
import { HTTP_STATUS } from '@/lib/constants';
import { logger } from '@/lib/logger';

/**
 * GET /api/config
 * Get current user's WireGuard peer configuration
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
    logger.error('api', 'Failed to get config', error);
    return jsonResponse.error('Failed to get configuration');
  }
}

/**
 * PUT /api/config
 * Create or update current user's WireGuard peer configuration
 *
 * Request body:
 * - { publicKey: string } - Create new peer OR update existing peer's public key
 * - {} (empty) - Renew existing peer's TTL
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const username = session.user.username!;
    const existingPeer = await getPeerByUsername(username);

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { publicKey } = body;

    // Case 1: Peer exists + publicKey provided → Update public key
    if (existingPeer && publicKey) {
      if (!isValidPublicKey(publicKey)) {
        return jsonResponse.badRequest('Invalid public key format');
      }

      await updatePeerPublicKey(username, publicKey);

      const updatedPeer = await getPeerByUsername(username);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedPeer,
      });
    }

    // Case 2: Peer exists + no publicKey → Renew TTL
    if (existingPeer && !publicKey) {
      await renewPeer(username);

      const updatedPeer = await getPeerByUsername(username);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedPeer,
      });
    }

    // Case 3: No peer + publicKey provided → Create new peer
    if (!existingPeer && publicKey) {
      if (!isValidPublicKey(publicKey)) {
        return jsonResponse.badRequest('Invalid public key format');
      }

      const allowedAddress = await getNextAvailableIP();
      await createPeer(username, publicKey, allowedAddress);

      const newPeer = await getPeerByUsername(username);
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: newPeer,
        },
        { status: HTTP_STATUS.CREATED }
      );
    }

    // Case 4: No peer + no publicKey → Error
    return jsonResponse.badRequest('Public key is required to create a new configuration');
  } catch (error) {
    logger.error('api', 'Failed to update config', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to update configuration'));
  }
}

/**
 * DELETE /api/config
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
    logger.error('api', 'Failed to delete config', error);
    return jsonResponse.error(getErrorMessage(error, 'Failed to delete configuration'));
  }
}
