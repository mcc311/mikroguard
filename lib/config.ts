import { z } from 'zod';

/**
 * Central configuration module with type-safe validation
 * All environment variables are validated at startup
 * No hardcoded fallback values for required configuration
 */

const configSchema = z.object({
  // LDAP Configuration
  ldap: z.object({
    url: z.string().url({ message: 'LDAP_URL must be a valid URL (e.g., ldap://localhost:389)' }),
    bindDN: z.string().min(1, 'LDAP_BIND_DN is required'),
    bindPassword: z.string().min(1, 'LDAP_BIND_PASSWORD is required'),
    searchBase: z.string().min(1, 'LDAP_SEARCH_BASE is required'),
    adminGroup: z.string().min(1, 'LDAP_ADMIN_GROUP is required'),
  }),

  // WireGuard Configuration
  wireguard: z.object({
    interfaceName: z.string().default('wireguard1'),
    subnet: z.string().cidrv4('WG_SUBNET must be a valid IPv4 CIDR (e.g., 10.10.10.0/24)').default('10.10.10.0/24'),
    dns: z.string().default('1.1.1.1'),
    allowedIPs: z.array(z.string()).default(['0.0.0.0/0']),
    endpoint: z.string().min(1, 'WG_ENDPOINT is required (e.g., vpn.example.com:51820)'),
    persistentKeepalive: z.number().int().min(0).max(65535).default(25),
    expirationDays: z.number().int().min(1).default(90),
    serverPublicKey: z.string().length(44, 'WireGuard public keys must be 44 characters').optional(),

    // IP allocation settings
    ipAllocation: z.object({
      startIP: z.number().int().min(2).max(254).default(2),
      endIP: z.number().int().min(2).max(254).default(254),
      cidrSuffix: z.string().default('/32'),
    }).default({ startIP: 2, endIP: 254, cidrSuffix: '/32' }),
  }),

  // RouterOS Configuration
  routeros: z.object({
    host: z.string().min(1, 'ROUTEROS_HOST is required'),
    port: z.number().int().min(1).max(65535).default(8080),
    username: z.string().min(1, 'ROUTEROS_USERNAME is required'),
    password: z.string().min(1, 'ROUTEROS_PASSWORD is required'),
    useTls: z.boolean().default(false),
  }),

  // NextAuth Configuration
  auth: z.object({
    secret: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
    sessionMaxAge: z.number().int().min(60).default(86400), // 24 hours in seconds
  }),

  // Cron Configuration
  cron: z.object({
    secret: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  }),

  // QR Code Configuration
  qrCode: z.object({
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('L'),
    width: z.number().int().min(100).max(1000).default(300),
    margin: z.number().int().min(0).max(10).default(2),
  }).default({ errorCorrectionLevel: 'L', width: 300, margin: 2 }),
});

// Parse and validate environment variables
function loadConfig() {
  try {
    // Parse allowed IPs from comma-separated string
    const allowedIPsRaw = process.env.WG_DEFAULT_ALLOWED_IPS || '0.0.0.0/0';
    const allowedIPs = allowedIPsRaw.split(',').map(ip => ip.trim());

    const rawConfig = {
      ldap: {
        url: process.env.LDAP_URL,
        bindDN: process.env.LDAP_BIND_DN,
        bindPassword: process.env.LDAP_BIND_PASSWORD,
        searchBase: process.env.LDAP_SEARCH_BASE,
        adminGroup: process.env.LDAP_ADMIN_GROUP,
      },
      wireguard: {
        interfaceName: process.env.WG_INTERFACE_NAME,
        subnet: process.env.WG_SUBNET,
        dns: process.env.WG_DNS,
        allowedIPs,
        endpoint: process.env.WG_ENDPOINT,
        persistentKeepalive: process.env.WG_PERSISTENT_KEEPALIVE
          ? parseInt(process.env.WG_PERSISTENT_KEEPALIVE, 10)
          : undefined,
        expirationDays: process.env.WG_EXPIRATION_DAYS
          ? parseInt(process.env.WG_EXPIRATION_DAYS, 10)
          : undefined,
        serverPublicKey: process.env.WG_SERVER_PUBLIC_KEY,
        ipAllocation: {
          startIP: process.env.WG_IP_START
            ? parseInt(process.env.WG_IP_START, 10)
            : undefined,
          endIP: process.env.WG_IP_END
            ? parseInt(process.env.WG_IP_END, 10)
            : undefined,
          cidrSuffix: process.env.WG_IP_CIDR_SUFFIX,
        },
      },
      routeros: {
        host: process.env.ROUTEROS_HOST,
        port: process.env.ROUTEROS_PORT
          ? parseInt(process.env.ROUTEROS_PORT, 10)
          : undefined,
        username: process.env.ROUTEROS_USERNAME,
        password: process.env.ROUTEROS_PASSWORD,
        useTls: process.env.ROUTEROS_USE_TLS === 'true',
      },
      auth: {
        secret: process.env.NEXTAUTH_SECRET,
        sessionMaxAge: process.env.NEXTAUTH_SESSION_MAX_AGE
          ? parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE, 10)
          : undefined,
      },
      cron: {
        secret: process.env.CRON_SECRET,
      },
      qrCode: {
        errorCorrectionLevel: process.env.QR_ERROR_CORRECTION as 'L' | 'M' | 'Q' | 'H' | undefined,
        width: process.env.QR_WIDTH
          ? parseInt(process.env.QR_WIDTH, 10)
          : undefined,
        margin: process.env.QR_MARGIN
          ? parseInt(process.env.QR_MARGIN, 10)
          : undefined,
      },
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      console.error('');
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  • ${path}: ${err.message}`);
      });
      console.error('');
      console.error('Please check your environment variables and try again.');
      console.error('See .env.example for required configuration.');
      process.exit(1);
    }
    throw error;
  }
}

// Export validated configuration
export const config = loadConfig();

// Export types
export type Config = z.infer<typeof configSchema>;
export type LDAPConfig = Config['ldap'];
export type WireGuardConfig = Config['wireguard'];
export type RouterOSConfig = Config['routeros'];
export type AuthConfig = Config['auth'];
export type CronConfig = Config['cron'];
export type QRCodeConfig = Config['qrCode'];
