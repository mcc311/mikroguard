/**
 * In-memory global template configuration store
 * This persists across requests in the Node.js runtime
 */

interface TemplateConfig {
  dns: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
}

// Global variable persists in memory during the Node.js process
// Initialized from environment variables
let globalTemplate: TemplateConfig = {
  dns: process.env.WG_DNS || '1.1.1.1',
  allowedIPs: process.env.WG_DEFAULT_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || ['0.0.0.0/0'],
  endpoint: process.env.WG_ENDPOINT || '',
  persistentKeepalive: parseInt(process.env.WG_PERSISTENT_KEEPALIVE || '25'),
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
