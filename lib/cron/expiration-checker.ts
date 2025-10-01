import { checkExpiredPeers } from '../routeros/wireguard';

/**
 * Check and disable expired WireGuard peers
 * This function should be called periodically (e.g., every hour)
 */
export async function runExpirationCheck(): Promise<void> {
  console.log('[Cron] Running expiration check...');

  try {
    const expiredPeers = await checkExpiredPeers();

    if (expiredPeers.length > 0) {
      console.log(`[Cron] Disabled ${expiredPeers.length} expired peers:`, expiredPeers);
    } else {
      console.log('[Cron] No expired peers found');
    }
  } catch (error) {
    console.error('[Cron] Failed to check expired peers:', error);
  }
}

/**
 * API route to trigger expiration check manually
 * Can also be used by external cron services (e.g., cron-job.org)
 */
export async function handleCronRequest(authToken?: string): Promise<{ success: boolean; message: string }> {
  // Verify auth token if provided
  const expectedToken = process.env.CRON_SECRET;
  if (expectedToken && authToken !== expectedToken) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const expiredPeers = await checkExpiredPeers();
    return {
      success: true,
      message: `Disabled ${expiredPeers.length} expired peers`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check expired peers',
    };
  }
}
