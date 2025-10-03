import { getRouterOSClient } from './client';
import { WireGuardPeer } from '@/types';
import { addDays, getUnixTime, fromUnixTime } from 'date-fns';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

const WG_INTERFACE = getConfig().wireguard.interfaceName;
const EXPIRATION_DAYS = getConfig().wireguard.expirationDays;

// RouterOS raw peer data structure
interface RouterOSPeer {
  '.id': string;
  name: string;
  interface: string;
  'public-key': string;
  'allowed-address': string;
  comment?: string;
  disabled?: string;
  [key: string]: unknown;
}

// RouterOS WireGuard interface data
interface RouterOSWGInterface {
  '.id': string;
  name: string;
  'public-key': string;
  [key: string]: unknown;
}

/**
 * Find raw peer data by username (internal helper)
 */
async function findPeerRawByUsername(username: string): Promise<RouterOSPeer> {
  const client = await getRouterOSClient();
  const peers = await client.get<RouterOSPeer>('/interface/wireguard/peers');
  const peer = peers.find((p) => p.name === username && p.interface === WG_INTERFACE);

  if (!peer) {
    throw new Error('Peer not found');
  }

  return peer;
}

/**
 * Get all WireGuard peers from RouterOS
 */
export async function getAllPeers(): Promise<WireGuardPeer[]> {
  const client = await getRouterOSClient();

  const peers = await client.get<RouterOSPeer>('/interface/wireguard/peers');

  if (!peers || peers.length === 0) {
    return [];
  }

  return peers
    .filter((item) => item.interface === WG_INTERFACE)
    .map((item) => {
      const ttl = parseTTLFromComment(item.comment || '');
      return {
        name: item.name || '',
        publicKey: item['public-key'] || '',
        allowedAddress: item['allowed-address'] || '',
        comment: item.comment || '',
        disabled: item.disabled === 'true' || item.disabled === 'yes',
        createdAt: new Date(), // RouterOS doesn't track creation time
        expiresAt: ttl ? fromUnixTime(ttl) : addDays(new Date(), EXPIRATION_DAYS),
      };
    });
}

/**
 * Get peer by username
 */
export async function getPeerByUsername(username: string): Promise<WireGuardPeer | null> {
  const peers = await getAllPeers();
  return peers.find((peer) => peer.name === username) || null;
}

/**
 * Create a new WireGuard peer
 */
export async function createPeer(
  username: string,
  publicKey: string,
  allowedAddress: string
): Promise<void> {
  const client = await getRouterOSClient();

  const expiresAt = addDays(new Date(), EXPIRATION_DAYS);
  const ttlComment = `ttl-${getUnixTime(expiresAt)}`;

  await client.put('/interface/wireguard/peers', {
    interface: WG_INTERFACE,
    name: username,
    'public-key': publicKey,
    'allowed-address': allowedAddress,
    comment: ttlComment,
  });
}

/**
 * Update peer TTL (renew)
 */
export async function renewPeer(username: string): Promise<void> {
  const client = await getRouterOSClient();
  const peer = await findPeerRawByUsername(username);

  const expiresAt = addDays(new Date(), EXPIRATION_DAYS);
  const ttlComment = `ttl-${getUnixTime(expiresAt)}`;

  await client.patch(`/interface/wireguard/peers/${peer['.id']}`, {
    comment: ttlComment,
    disabled: 'no',
  });
}

/**
 * Disable peer
 */
export async function disablePeer(username: string): Promise<void> {
  const client = await getRouterOSClient();
  const peer = await findPeerRawByUsername(username);

  await client.patch(`/interface/wireguard/peers/${peer['.id']}`, {
    disabled: 'yes',
  });
}

/**
 * Enable peer
 */
export async function enablePeer(username: string): Promise<void> {
  const client = await getRouterOSClient();
  const peer = await findPeerRawByUsername(username);

  await client.patch(`/interface/wireguard/peers/${peer['.id']}`, {
    disabled: 'no',
  });
}

/**
 * Update peer public key
 */
export async function updatePeerPublicKey(username: string, publicKey: string): Promise<void> {
  const client = await getRouterOSClient();
  const peer = await findPeerRawByUsername(username);

  await client.patch(`/interface/wireguard/peers/${peer['.id']}`, {
    'public-key': publicKey,
  });
}

/**
 * Delete peer (admin only)
 */
export async function deletePeer(username: string): Promise<void> {
  const client = await getRouterOSClient();
  const peer = await findPeerRawByUsername(username);

  await client.delete(`/interface/wireguard/peers/${peer['.id']}`);
}

/**
 * Get raw peer data without parsing (for performance-critical operations)
 */
async function getRawPeers(): Promise<RouterOSPeer[]> {
  const client = await getRouterOSClient();
  const peers = await client.get<RouterOSPeer>('/interface/wireguard/peers');
  return peers.filter((item) => item.interface === WG_INTERFACE);
}

/**
 * Get next available IP address in subnet
 */
export async function getNextAvailableIP(): Promise<string> {
  const subnet = getConfig().wireguard.subnet;
  const [network] = subnet.split('/');
  const [a, b, c] = network.split('.').map(Number);

  // Use raw peers to avoid unnecessary parsing
  const rawPeers = await getRawPeers();
  const usedIPs = new Set(
    rawPeers.map((peer) => peer['allowed-address'].split('/')[0])
  );

  const { startIP, endIP, cidrSuffix } = getConfig().wireguard.ipAllocation;

  // Iterate through available IP range
  for (let i = startIP; i <= endIP; i++) {
    const ip = `${a}.${b}.${c}.${i}`;
    if (!usedIPs.has(ip)) {
      return `${ip}${cidrSuffix}`;
    }
  }

  throw new Error('No available IP addresses in subnet');
}

/**
 * Check and disable expired peers
 */
export async function checkExpiredPeers(): Promise<string[]> {
  const peers = await getAllPeers();
  const now = new Date();
  const expiredPeers: string[] = [];

  for (const peer of peers) {
    if (!peer.disabled && peer.expiresAt < now) {
      try {
        await disablePeer(peer.name);
        expiredPeers.push(peer.name);
      } catch (error) {
        logger.error('wireguard', `Failed to disable peer ${peer.name}`, error);
      }
    }
  }

  return expiredPeers;
}

/**
 * Parse TTL from comment
 */
function parseTTLFromComment(comment: string): number | null {
  const match = comment.match(/ttl-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get WireGuard interface public key
 */
export async function getServerPublicKey(): Promise<string> {
  const client = await getRouterOSClient();

  const interfaces = await client.get<RouterOSWGInterface>('/interface/wireguard');
  const wgInterface = interfaces.find((i) => i.name === WG_INTERFACE);

  if (!wgInterface) {
    throw new Error('WireGuard interface not found');
  }

  return wgInterface['public-key'];
}

/**
 * Get server public key with fallback to config
 */
export async function getServerPublicKeyOrFallback(): Promise<string> {
  try {
    return await getServerPublicKey();
  } catch {
    // Fallback to configured value if RouterOS call fails
    const publicKey = getConfig().wireguard.serverPublicKey;
    if (publicKey) {
      return publicKey;
    }
    throw new Error('Server public key not available');
  }
}
