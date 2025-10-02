/**
 * In-memory global template configuration store
 * This persists across requests in the Node.js runtime
 */

import { config } from '@/lib/config';

interface TemplateConfig {
  dns: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
}

// Global variable persists in memory during the Node.js process
// Initialized from configuration
let globalTemplate: TemplateConfig = {
  dns: config.wireguard.dns,
  allowedIPs: config.wireguard.allowedIPs,
  endpoint: config.wireguard.endpoint,
  persistentKeepalive: config.wireguard.persistentKeepalive,
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
