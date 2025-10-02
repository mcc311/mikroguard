import { WireGuardConfig } from '@/types';
import { getGlobalTemplate } from '@/lib/store/template';
import { config } from '@/lib/config';

/**
 * Build WireGuard configuration file content
 */
export function buildConfigFile(wgConfig: WireGuardConfig): string {
  const allowedIPsStr = wgConfig.allowedIPs.join(', ');

  return `[Interface]
PrivateKey = ${wgConfig.privateKey}
Address = ${wgConfig.address}
DNS = ${wgConfig.dns}

[Peer]
PublicKey = ${wgConfig.publicKey}
AllowedIPs = ${allowedIPsStr}
Endpoint = ${wgConfig.endpoint}
PersistentKeepalive = ${wgConfig.persistentKeepalive}
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
    publicKey: config.wireguard.serverPublicKey || '',
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
