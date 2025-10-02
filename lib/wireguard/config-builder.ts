import { WireGuardConfig } from '@/types';
import { getGlobalTemplate } from '@/lib/store/template';

/**
 * Build WireGuard configuration file content
 */
export function buildConfigFile(config: WireGuardConfig): string {
  const allowedIPsStr = config.allowedIPs.join(', ');

  return `[Interface]
PrivateKey = ${config.privateKey}
Address = ${config.address}
DNS = ${config.dns}

[Peer]
PublicKey = ${config.publicKey}
AllowedIPs = ${allowedIPsStr}
Endpoint = ${config.endpoint}
PersistentKeepalive = ${config.persistentKeepalive}
`;
}

/**
 * Get default config template from global store
 */
export function getDefaultTemplate(): Partial<WireGuardConfig> {
  const template = getGlobalTemplate();
  return {
    dns: template.dns,
    allowedIPs: template.allowedIPs,
    endpoint: template.endpoint,
    persistentKeepalive: template.persistentKeepalive,
    publicKey: process.env.WG_SERVER_PUBLIC_KEY || '',
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<WireGuardConfig>): string[] {
  const errors: string[] = [];

  if (!config.privateKey) {
    errors.push('Private key is required');
  }

  if (!config.address) {
    errors.push('Address is required');
  }

  if (!config.publicKey) {
    errors.push('Server public key is required');
  }

  if (!config.endpoint) {
    errors.push('Endpoint is required');
  }

  if (!config.allowedIPs || config.allowedIPs.length === 0) {
    errors.push('At least one allowed IP is required');
  }

  return errors;
}
