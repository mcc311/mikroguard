import { checkExpiredPeers } from '../routeros/wireguard';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * Check and disable expired WireGuard peers
 * This function should be called periodically (e.g., every hour)
 */
export async function runExpirationCheck(): Promise<void> {
  logger.info('cron', 'Running expiration check');

  try {
    const expiredPeers = await checkExpiredPeers();

    if (expiredPeers.length > 0) {
      logger.info('cron', `Disabled ${expiredPeers.length} expired peers`, { peers: expiredPeers });
    } else {
      logger.info('cron', 'No expired peers found');
    }
  } catch (error) {
    logger.error('cron', 'Failed to check expired peers', error);
  }
}

/**
 * API route to trigger expiration check manually
 * Can also be used by external cron services (e.g., cron-job.org)
 */
export async function handleCronRequest(authToken?: string): Promise<{ success: boolean; message: string }> {
  // Verify auth token
  if (authToken !== getConfig().cron.secret) {
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
