// Server-side configuration - loaded lazily at runtime
// DO NOT import this in client components or during build

import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    name: z.string().default('MikroGuard'),
  }),
  ldap: z.object({
    url: z.string().url({ message: 'LDAP_URL must be a valid URL (e.g., ldap://localhost:389)' }),
    bindDN: z.string().min(1, 'LDAP_BIND_DN is required'),
    bindPassword: z.string().min(1, 'LDAP_BIND_PASSWORD is required'),
    searchBase: z.string().min(1, 'LDAP_SEARCH_BASE is required'),
    adminGroup: z.string().min(1, 'LDAP_ADMIN_GROUP is required'),
  }),
  wireguard: z.object({
    interfaceName: z.string().default('wireguard1'),
    subnet: z.string().cidrv4('WG_SUBNET must be a valid IPv4 CIDR (e.g., 10.10.10.0/24)').default('10.10.10.0/24'),
    dns: z.string().default('1.1.1.1'),
    allowedIPs: z.array(z.string()).default(['0.0.0.0/0']),
    endpoint: z.string().min(1, 'WG_ENDPOINT is required (e.g., vpn.example.com:51820)'),
    persistentKeepalive: z.number().int().min(0).max(65535).default(25),
    expirationDays: z.number().int().min(1).default(90),
    serverPublicKey: z.string().length(44, 'WireGuard public keys must be 44 characters').optional(),
    ipAllocation: z.object({
      startIP: z.number().int().min(2).max(254).default(2),
      endIP: z.number().int().min(2).max(254).default(254),
      cidrSuffix: z.string().default('/32'),
    }).default({ startIP: 2, endIP: 254, cidrSuffix: '/32' }),
  }),
  routeros: z.object({
    host: z.string().min(1, 'ROUTEROS_HOST is required'),
    port: z.number().int().min(1).max(65535).default(8080),
    username: z.string().min(1, 'ROUTEROS_USERNAME is required'),
    password: z.string().min(1, 'ROUTEROS_PASSWORD is required'),
    useTls: z.boolean().default(false),
  }),
  auth: z.object({
    secret: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
    sessionMaxAge: z.number().int().min(60).default(86400),
  }),
  cron: z.object({
    secret: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  }),
});

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

function parseEnvInt(value: string | undefined): number | undefined {
  return value ? parseInt(value, 10) : undefined;
}

function loadConfig(): Config {
  if (isBuildTime) {
    return configSchema.parse({
      app: { name: 'MikroGuard' },
      ldap: {
        url: 'ldap://build-placeholder',
        bindDN: 'build',
        bindPassword: 'build',
        searchBase: 'dc=build',
        adminGroup: 'build',
      },
      wireguard: {
        endpoint: 'build.placeholder:51820',
      },
      routeros: {
        host: 'build',
        username: 'build',
        password: 'build',
      },
      auth: {
        secret: 'build-placeholder-secret-32chars',
      },
      cron: {
        secret: 'build-placeholder-16',
      },
    });
  }

  const allowedIPs = (process.env.WG_DEFAULT_ALLOWED_IPS || '0.0.0.0/0')
    .split(',')
    .map(ip => ip.trim());

  try {
    return configSchema.parse({
      app: {
        name: process.env.NEXT_PUBLIC_APP_NAME,
      },
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
        persistentKeepalive: parseEnvInt(process.env.WG_PERSISTENT_KEEPALIVE),
        expirationDays: parseEnvInt(process.env.WG_EXPIRATION_DAYS),
        serverPublicKey: process.env.WG_SERVER_PUBLIC_KEY,
        ipAllocation: {
          startIP: parseEnvInt(process.env.WG_IP_START),
          endIP: parseEnvInt(process.env.WG_IP_END),
          cidrSuffix: process.env.WG_IP_CIDR_SUFFIX,
        },
      },
      routeros: {
        host: process.env.ROUTEROS_HOST,
        port: parseEnvInt(process.env.ROUTEROS_PORT),
        username: process.env.ROUTEROS_USERNAME,
        password: process.env.ROUTEROS_PASSWORD,
        useTls: process.env.ROUTEROS_USE_TLS === 'true',
      },
      auth: {
        secret: process.env.NEXTAUTH_SECRET,
        sessionMaxAge: parseEnvInt(process.env.NEXTAUTH_SESSION_MAX_AGE),
      },
      cron: {
        secret: process.env.CRON_SECRET,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:\n');
      error.issues.forEach((err) => {
        console.error(`  • ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nSee .env.example for required configuration.');
      process.exit(1);
    }
    throw error;
  }
}

let configCache: Config | null = null;

export function getConfig(): Config {
  if (!configCache) {
    configCache = loadConfig();
  }
  return configCache;
}

// Backward compatibility - deprecated, use getConfig() instead
export const config = getConfig();

export type Config = z.infer<typeof configSchema>;
export type LDAPConfig = Config['ldap'];
export type WireGuardConfig = Config['wireguard'];
export type RouterOSConfig = Config['routeros'];
export type AuthConfig = Config['auth'];
export type CronConfig = Config['cron'];
