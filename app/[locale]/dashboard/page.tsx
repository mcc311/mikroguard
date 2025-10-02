'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WireGuardPeer } from '@/types';
import { DashboardCardSkeleton, ConfigDisplaySkeleton, LoadingPage } from '@/components/loading-skeletons';
import { formatDistanceToNow, format } from 'date-fns';
import { Shield, Plus, RefreshCw, PenLine, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { toast } from 'sonner';
import { UI_TIMEOUTS, TIME_THRESHOLDS } from '@/lib/constants';
import { validateWireGuardPublicKey } from '@/lib/validation/wireguard';
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const { status } = useSession();
  const [peer, setPeer] = useState<WireGuardPeer | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConfig();
    }
  }, [status]);

  const fetchConfig = async () => {
    try {
      const [peerRes, configRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/config/file'),
      ]);

      const peerData = await peerRes.json();

      if (peerData.success) {
        const peer = {
          ...peerData.data,
          createdAt: new Date(peerData.data.createdAt),
          expiresAt: new Date(peerData.data.expiresAt),
        };
        setPeer(peer);

        if (configRes.ok) {
          const configText = await configRes.text();
          setConfig(configText);
        }
      } else {
        setPeer(null);
        setConfig(null);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewConfig = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.success) {
        await fetchConfig();
        toast.success(tToast('configRenewed'));
      } else {
        toast.error(tToast('failedToRenew') + ': ' + data.error);
      }
    } catch {
      toast.error(tToast('failedToRenew'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateKey = async () => {
    const validation = validateWireGuardPublicKey(newPublicKey);
    if (!validation.isValid) {
      setKeyError(validation.error || 'Invalid public key');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: newPublicKey.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchConfig();
        setShowKeyDialog(false);
        setNewPublicKey('');
        toast.success(tToast('keyUpdated'));
      } else {
        toast.error(tToast('failedToUpdateKey') + ': ' + data.error);
      }
    } catch {
      toast.error(tToast('failedToUpdateKey'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyConfig = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), UI_TIMEOUTS.COPY_FEEDBACK_MS);
      toast.success(tToast('configCopied'));
    } catch {
      toast.error(tToast('failedToCopy'));
    }
  };

  const handleDeleteConfig = async () => {
    setShowDeleteDialog(false);
    setActionLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setPeer(null);
        setConfig(null);
        toast.success(tToast('configDeleted'));
      } else {
        toast.error(tToast('failedToDelete') + ': ' + data.error);
      }
    } catch {
      toast.error(tToast('failedToDelete'));
    } finally {
      setActionLoading(false);
    }
  };

  if (status === 'loading') {
    return <LoadingPage />;
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <DashboardCardSkeleton />
          <ConfigDisplaySkeleton />
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const isExpiringSoon = peer && peer.expiresAt && (peer.expiresAt.getTime() - Date.now()) < TIME_THRESHOLDS.EXPIRATION_WARNING_MS;
  const isExpired = peer && peer.expiresAt && peer.expiresAt.getTime() < Date.now();

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Card */}
          <Card className="relative overflow-hidden">
            {/* Status Indicator Bar */}
            {peer && (
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  peer.disabled
                    ? 'bg-gray-400'
                    : isExpired
                    ? 'bg-red-500'
                    : isExpiringSoon
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
              />
            )}
            <CardHeader>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {peer ? (
                <div className="space-y-6">
                  {/* Key Information Grid */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* IP Address with Copy */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('ipAddress')}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-semibold">{peer.allowedAddress}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(peer.allowedAddress);
                            toast.success(tToast('ipCopied'));
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Expiration with Countdown */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('expires')}</p>
                      <div>
                        <p
                          className={`text-lg font-semibold ${
                            isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-foreground'
                          }`}
                        >
                          {formatDistanceToNow(peer.expiresAt, { addSuffix: true })}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(peer.expiresAt, 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Public Key Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{t('publicKey')}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewPublicKey(peer.publicKey);
                          setShowKeyDialog(true);
                        }}
                        className="h-7 text-xs"
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        {t('updateKey')}
                      </Button>
                    </div>
                    <div className="relative group">
                      <code className="block font-mono text-sm break-all bg-muted/50 p-3 rounded border">
                        {peer.publicKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7"
                        onClick={() => {
                          navigator.clipboard.writeText(peer.publicKey);
                          toast.success(tToast('publicKeyCopied'));
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={handleRenewConfig} disabled={actionLoading} className="flex-1" size="lg">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('renewConfiguration')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewPublicKey(peer.publicKey);
                        setShowKeyDialog(true);
                      }}
                      disabled={actionLoading}
                      size="lg"
                    >
                      <PenLine className="w-4 h-4 mr-2" />
                      {t('updateKeyButton')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={actionLoading}
                      size="lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t('noPeer.title')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {t('noPeer.description')}
                  </p>
                  <Link href="/dashboard/new">
                    <Button size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('noPeer.createButton')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config Display */}
          {peer && config && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('configFile.title')}</CardTitle>
                    <CardDescription>{t('configFile.description')}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {tCommon('copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        {tCommon('copy')}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="font-mono text-xs bg-muted/50 p-4 rounded border overflow-x-auto">
                  <code>{config}</code>
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Public Key Edit Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('updateKeyDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('updateKeyDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publicKey">{t('updateKeyDialog.label')}</Label>
              <Input
                id="publicKey"
                placeholder={t('updateKeyDialog.placeholder')}
                value={newPublicKey}
                onChange={(e) => {
                  setNewPublicKey(e.target.value);
                  if (keyError) setKeyError('');
                }}
                className={`font-mono text-sm ${keyError ? 'border-destructive' : ''}`}
              />
              {keyError ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {keyError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('updateKeyDialog.hint')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowKeyDialog(false);
                setNewPublicKey('');
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdateKey} disabled={actionLoading}>
              {actionLoading ? t('updateKeyDialog.updating') : t('updateKeyDialog.label')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
