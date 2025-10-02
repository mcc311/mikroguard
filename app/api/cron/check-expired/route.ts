import { NextRequest, NextResponse } from 'next/server';
import { handleCronRequest } from '@/lib/cron/expiration-checker';
import { jsonResponse } from '@/lib/api-helpers';

/**
 * GET /api/cron/check-expired
 * Endpoint for external cron services to trigger expiration check
 *
 * Usage with cron-job.org or similar:
 * GET https://your-domain.com/api/cron/check-expired?token=YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const result = await handleCronRequest(token || undefined);

  if (!result.success) {
    if (result.message === 'Unauthorized') {
      return jsonResponse.unauthorized(result.message);
    }
    return jsonResponse.error(result.message);
  }

  return NextResponse.json(result);
}

/**
 * POST /api/cron/check-expired
 * Alternative POST endpoint with token in header
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token');

  const result = await handleCronRequest(token || undefined);

  if (!result.success) {
    if (result.message === 'Unauthorized') {
      return jsonResponse.unauthorized(result.message);
    }
    return jsonResponse.error(result.message);
  }

  return NextResponse.json(result);
}
