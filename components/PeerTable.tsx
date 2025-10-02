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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Ban, Play, Trash2, MoreVertical, Copy, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface PeerTableProps {
  peers: WireGuardPeer[];
  onAction?: (username: string, action: 'enable' | 'disable' | 'renew' | 'delete' | 'edit-key') => void;
  showActions?: boolean;
}

export function PeerTable({ peers, onAction, showActions = false }: PeerTableProps) {
  const t = useTranslations('peerTable');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getExpirationStatus = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (days < 7) return { label: `${days}d left`, variant: 'default' as const };
    return { label: `${days}d left`, variant: 'secondary' as const };
  };

  const handleCopyPublicKey = (publicKey: string) => {
    navigator.clipboard.writeText(publicKey);
    setCopiedKey(publicKey);
    toast.success(tToast('publicKeyCopied'));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('username')}</TableHead>
            <TableHead>{t('ipAddress')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('expires')}</TableHead>
            <TableHead>{t('publicKey')}</TableHead>
            {showActions && <TableHead className="w-[70px]">{t('actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center">
                <p className="text-muted-foreground">{t('noPeers')}</p>
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
                      {peer.disabled ? t('disabled') : t('active')}
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code
                          className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors"
                          onClick={() => handleCopyPublicKey(peer.publicKey)}
                        >
                          {copiedKey === peer.publicKey ? (
                            <>Copied!</>
                          ) : (
                            <>{peer.publicKey.substring(0, 16)}...</>
                          )}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">Click to copy</p>
                          <code className="text-xs break-all">{peer.publicKey}</code>
                        </div>
                      </TooltipContent>
                    </Tooltip>
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
                          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {peer.disabled ? (
                            <DropdownMenuItem onClick={() => onAction(peer.name, 'enable')}>
                              <Play className="mr-2 h-4 w-4" />
                              {t('enable')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onAction(peer.name, 'disable')}>
                              <Ban className="mr-2 h-4 w-4" />
                              {t('disable')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onAction(peer.name, 'renew')}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t('renew')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction(peer.name, 'edit-key')}>
                            <Key className="mr-2 h-4 w-4" />
                            {t('updateKey')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onAction(peer.name, 'delete')}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tCommon('delete')}
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
    </TooltipProvider>
  );
}
