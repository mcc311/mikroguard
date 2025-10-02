import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getGlobalTemplate, updateGlobalTemplate } from '@/lib/store/template';
import { ApiResponse } from '@/types';

/**
 * GET /api/admin/template
 * Get current global template configuration
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = getGlobalTemplate();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/template
 * Update global template configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { dns, allowedIPs, endpoint, persistentKeepalive } = body;

    updateGlobalTemplate({
      dns,
      allowedIPs,
      endpoint,
      persistentKeepalive,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Template updated successfully' },
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}
