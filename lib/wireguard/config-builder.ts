import { WireGuardConfig } from '@/types';
import { getGlobalTemplate } from '@/lib/store/template';
import { config } from '@/lib/config';
import { UI_TEXT } from '@/lib/constants';

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
 * Custom config input (subset of WireGuardConfig fields that can be customized)
 */
type CustomConfigInput = Partial<Pick<WireGuardConfig, 'dns' | 'endpoint' | 'persistentKeepalive'>> & {
  allowedIPs?: string; // Accept as comma-separated string
};

/**
 * Build config with defaults and custom values
 */
export function buildConfigWithDefaults(
  customConfig: CustomConfigInput,
  address: string,
  serverPublicKey: string
) {
  const template = getGlobalTemplate();

  return {
    privateKey: UI_TEXT.PLACEHOLDER_PRIVATE_KEY,
    address,
    dns: customConfig.dns || template.dns,
    allowedIPs: customConfig.allowedIPs
      ? customConfig.allowedIPs.split(',').map(ip => ip.trim())
      : template.allowedIPs,
    endpoint: customConfig.endpoint || template.endpoint,
    persistentKeepalive: customConfig.persistentKeepalive !== undefined
      ? customConfig.persistentKeepalive
      : template.persistentKeepalive,
    publicKey: serverPublicKey,
  };
}
