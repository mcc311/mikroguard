import { WireGuardConfig } from '@/types';

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
 * Get default config template
 */
export function getDefaultTemplate(): Partial<WireGuardConfig> {
  return {
    dns: process.env.WG_DNS || '1.1.1.1',
    allowedIPs: (process.env.WG_DEFAULT_ALLOWED_IPS || '10.10.10.0/24').split(',').map(ip => ip.trim()),
    endpoint: process.env.WG_ENDPOINT || '',
    persistentKeepalive: parseInt(process.env.WG_PERSISTENT_KEEPALIVE || '25'),
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
