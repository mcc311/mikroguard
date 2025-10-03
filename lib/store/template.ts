/**
 * In-memory global template configuration store
 * This persists across requests in the Node.js runtime
 */

import { getConfig } from '@/lib/config';

interface TemplateConfig {
  dns: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
}

// Global variable persists in memory during the Node.js process
// Initialized from configuration
let globalTemplate: TemplateConfig = {
  dns: getConfig().wireguard.dns,
  allowedIPs: getConfig().wireguard.allowedIPs,
  endpoint: getConfig().wireguard.endpoint,
  persistentKeepalive: getConfig().wireguard.persistentKeepalive,
};

export function getGlobalTemplate(): TemplateConfig {
  return { ...globalTemplate };
}

export function updateGlobalTemplate(config: Partial<TemplateConfig>): void {
  globalTemplate = {
    ...globalTemplate,
    ...config,
  };
}
