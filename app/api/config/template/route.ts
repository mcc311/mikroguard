import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getDefaultTemplate } from '@/lib/wireguard/config-builder';
import { ApiResponse } from '@/types';
import { jsonResponse } from '@/lib/api-helpers';

/**
 * GET /api/config/template
 * Get default configuration template
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return jsonResponse.unauthorized();
    }

    const template = getDefaultTemplate();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return jsonResponse.error('Failed to get template');
  }
}
