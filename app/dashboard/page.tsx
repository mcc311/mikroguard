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
import { Shield, Plus, RefreshCw, PenLine, Copy, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UI_TIMEOUTS, TIME_THRESHOLDS } from '@/lib/constants';

export default function DashboardPage() {
  const { status } = useSession();
  const [peer, setPeer] = useState<WireGuardPeer | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConfig();
    }
  }, [status]);

  const fetchConfig = async () => {
    try {
      const [peerRes, configRes] = await Promise.all([
        fetch('/api/config/my'),
        fetch('/api/config/download'),
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
      const res = await fetch('/api/config/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.success) {
        await fetchConfig();
        toast.success('Configuration renewed successfully!');
      } else {
        toast.error('Failed to renew config: ' + data.error);
      }
    } catch {
      toast.error('Failed to renew config');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!newPublicKey.trim()) {
      toast.error('Please enter a valid public key');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/config/update-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: newPublicKey.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchConfig();
        setShowKeyDialog(false);
        setNewPublicKey('');
        toast.success('Public key updated successfully!');
      } else {
        toast.error('Failed to update key: ' + data.error);
      }
    } catch {
      toast.error('Failed to update key');
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
      toast.success('Configuration copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDeleteConfig = async () => {
    setShowDeleteDialog(false);
    setActionLoading(true);
    try {
      const res = await fetch('/api/config/my', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setPeer(null);
        setConfig(null);
        toast.success('Configuration deleted successfully');
      } else {
        toast.error('Failed to delete config: ' + data.error);
      }
    } catch {
      toast.error('Failed to delete config');
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
              <CardTitle>VPN Configuration</CardTitle>
              <CardDescription>Your WireGuard connection details</CardDescription>
            </CardHeader>
            <CardContent>
              {peer ? (
                <div className="space-y-6">
                  {/* Key Information Grid */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* IP Address with Copy */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-semibold">{peer.allowedAddress}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(peer.allowedAddress);
                            toast.success('IP address copied!');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Expiration with Countdown */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Expires</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Public Key</p>
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
                        Update
                      </Button>
                    </div>
                    <div className="relative group">
                      <code className="block font-mono text-xs break-all bg-muted/50 p-3 rounded border">
                        {peer.publicKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7"
                        onClick={() => {
                          navigator.clipboard.writeText(peer.publicKey);
                          toast.success('Public key copied!');
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
                      Renew Configuration
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
                      Update Key
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
                  <h3 className="text-lg font-semibold mb-2">No VPN Configuration</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    You haven&apos;t created a WireGuard configuration yet. Create one now to get started with secure VPN
                    access.
                  </p>
                  <Link href="/dashboard/new">
                    <Button size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Configuration
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
                    <CardTitle>Configuration File</CardTitle>
                    <CardDescription>Copy this to your WireGuard client</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
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
            <DialogTitle>Update Public Key</DialogTitle>
            <DialogDescription>
              Enter your new WireGuard public key. This is useful when you change devices or regenerate your keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Input
                id="publicKey"
                placeholder="Enter your new public key..."
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The public key should be 44 characters long and end with &apos;=&apos;
              </p>
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
              Cancel
            </Button>
            <Button onClick={handleUpdateKey} disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Update Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your WireGuard configuration? This action cannot be undone.
              You will need to create a new configuration to connect to the VPN again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfig}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
