'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { formatDistanceToNow, format } from 'date-fns';
import { Shield, Plus, RefreshCw, PenLine, Copy, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [peer, setPeer] = useState<WireGuardPeer | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
    } catch (error) {
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
    } catch (error) {
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
      setTimeout(() => setCopied(false), 2000);
      toast.success('Configuration copied to clipboard!');
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to delete config');
    } finally {
      setActionLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const isExpiringSoon = peer && peer.expiresAt && (peer.expiresAt.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  const isExpired = peer && peer.expiresAt && peer.expiresAt.getTime() < Date.now();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">WireGuard Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name}
            </span>
            {(session?.user as any)?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin Panel
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/api/auth/signout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Status</CardTitle>
              <CardDescription>Your WireGuard VPN configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {peer ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={peer.disabled ? 'destructive' : 'default'}>
                        {peer.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono">{peer.allowedAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className={isExpired ? 'text-red-500' : isExpiringSoon ? 'text-yellow-500' : ''}>
                        {format(peer.expiresAt, 'yyyy-MM-dd HH:mm:ss')}
                        <span className="text-xs block text-muted-foreground">
                          {formatDistanceToNow(peer.expiresAt, { addSuffix: true })}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Public Key</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNewPublicKey(peer.publicKey);
                            setShowKeyDialog(true);
                          }}
                        >
                          <PenLine className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {peer.publicKey}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleRenewConfig} disabled={actionLoading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew (Extend 3 Months)
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={actionLoading}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Configuration
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have a WireGuard configuration yet
                  </p>
                  <Link href="/dashboard/new">
                    <Button>
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
                    <CardTitle>Your Configuration</CardTitle>
                    <CardDescription>Copy this configuration to your WireGuard client</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyConfig}
                  >
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
                <Textarea
                  value={config}
                  readOnly
                  className="font-mono text-xs h-64 resize-none"
                />
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
                The public key should be 44 characters long and end with '='
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
    </div>
  );
}
