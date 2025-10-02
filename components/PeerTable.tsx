'use client';

import { WireGuardPeer } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Ban, Play, Trash2, MoreVertical, Copy } from 'lucide-react';

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
            {showActions && <TableHead className="w-[70px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center">
                <p className="text-muted-foreground">No peers found</p>
              </TableCell>
            </TableRow>
          ) : (
            peers.map((peer) => {
              const expirationStatus = getExpirationStatus(peer.expiresAt);
              return (
                <TableRow key={peer.name} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{peer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{peer.allowedAddress}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          navigator.clipboard.writeText(peer.allowedAddress);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={peer.disabled ? 'secondary' : 'default'}
                      className={peer.disabled ? '' : 'bg-green-500 hover:bg-green-600 text-white'}
                    >
                      {peer.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={expirationStatus.variant} className="w-fit">
                        {expirationStatus.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(peer.expiresAt, { addSuffix: true })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs text-muted-foreground">
                      {peer.publicKey.substring(0, 16)}...
                    </code>
                  </TableCell>
                  {showActions && onAction && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {peer.disabled ? (
                            <DropdownMenuItem onClick={() => onAction(peer.name, 'enable')}>
                              <Play className="mr-2 h-4 w-4" />
                              Enable
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onAction(peer.name, 'disable')}>
                              <Ban className="mr-2 h-4 w-4" />
                              Disable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onAction(peer.name, 'renew')}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renew
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onAction(peer.name, 'delete')}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
