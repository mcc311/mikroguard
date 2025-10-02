import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getAllPeers } from '@/lib/routeros/wireguard';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';

/**
 * GET /api/admin/peers
 * Get all WireGuard peers (admin only)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const peers = await getAllPeers();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: peers,
    });
  } catch (error) {
    console.error('Failed to get peers:', error);
    return jsonResponse.error('Failed to get peers');
  }
}
