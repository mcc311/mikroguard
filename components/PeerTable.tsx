'use client';

import { WireGuardPeer } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Ban, Play, Trash2 } from 'lucide-react';

interface PeerTableProps {
  peers: WireGuardPeer[];
  onAction?: (username: string, action: 'enable' | 'disable' | 'renew' | 'delete') => void;
  showActions?: boolean;
}

export function PeerTable({ peers, onAction, showActions = false }: PeerTableProps) {
  const getExpirationStatus = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (days < 7) return { label: `${days}d left`, variant: 'default' as const };
    return { label: `${days}d left`, variant: 'secondary' as const };
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Public Key</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground">
                No peers found
              </TableCell>
            </TableRow>
          ) : (
            peers.map((peer) => {
              const expirationStatus = getExpirationStatus(peer.expiresAt);
              return (
                <TableRow key={peer.name}>
                  <TableCell className="font-medium">{peer.name}</TableCell>
                  <TableCell className="font-mono text-sm">{peer.allowedAddress}</TableCell>
                  <TableCell>
                    <Badge variant={peer.disabled ? 'destructive' : 'default'}>
                      {peer.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={expirationStatus.variant}>
                      {expirationStatus.label}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(peer.expiresAt, { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-xs">
                    {peer.publicKey.substring(0, 20)}...
                  </TableCell>
                  {showActions && onAction && (
                    <TableCell>
                      <div className="flex gap-1">
                        {peer.disabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction(peer.name, 'enable')}
                            title="Enable"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction(peer.name, 'disable')}
                            title="Disable"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAction(peer.name, 'renew')}
                          title="Renew"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onAction(peer.name, 'delete')}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
