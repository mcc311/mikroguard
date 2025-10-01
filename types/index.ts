export interface User {
  username: string;
  displayName?: string;
  email?: string;
  isAdmin: boolean;
}

export interface WireGuardConfig {
  username: string;
  privateKey: string;
  address: string;
  dns: string;
  publicKey: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
}

export interface WireGuardPeer {
  name: string; // username
  publicKey: string;
  allowedAddress: string;
  comment: string; // format: ttl-{unix_timestamp}
  disabled: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  dns: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
  isDefault: boolean;
}

export interface RouterOSConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
