import { HTTP_STATUS, UI_TEXT } from './constants';
import { config } from './config';
import { getServerPublicKey } from './routeros/wireguard';
import { getGlobalTemplate } from './store/template';

/**
 * Get server public key with fallback
 */
export async function getServerPublicKeyOrFallback(): Promise<string> {
  try {
    return await getServerPublicKey();
  } catch (error) {
    // Fallback to configured value if RouterOS call fails
    if (config.wireguard.serverPublicKey) {
      return config.wireguard.serverPublicKey;
    }
    throw new Error('Server public key not available');
  }
}

/**
 * Build config with defaults and custom values
 */
export function buildConfigWithDefaults(
  customConfig: {
    dns?: string;
    allowedIPs?: string;
    endpoint?: string;
    persistentKeepalive?: number;
  },
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

/**
 * Create JSON response helpers
 */
export const jsonResponse = {
  ok: (data: any, status = HTTP_STATUS.OK) => {
    return Response.json(data, { status });
  },

  error: (message: string, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
    return Response.json({ error: message }, { status });
  },

  unauthorized: (message = 'Unauthorized') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.UNAUTHORIZED });
  },

  badRequest: (message = 'Bad request') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.BAD_REQUEST });
  },

  notFound: (message = 'Not found') => {
    return Response.json({ error: message }, { status: HTTP_STATUS.NOT_FOUND });
  },
};
