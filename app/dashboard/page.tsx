'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfigDisplay } from '@/components/ConfigDisplay';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { TemplateEditor } from '@/components/TemplateEditor';
import { WireGuardPeer } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Shield, Plus, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [peer, setPeer] = useState<WireGuardPeer | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
      const res = await fetch('/api/config/my');
      const data = await res.json();

      if (data.success) {
        setPeer(data.data);
      } else {
        setPeer(null);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async (publicKey: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/config/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });

      const data = await res.json();

      if (data.success) {
        setConfig(data.data.configFile);
        await fetchConfig();
      } else {
        alert('Failed to create config: ' + data.error);
      }
    } catch (error) {
      alert('Failed to create config');
    } finally {
      setActionLoading(false);
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
        setConfig(data.data.configFile);
        await fetchConfig();
        alert('Configuration renewed successfully!');
      } else {
        alert('Failed to renew config: ' + data.error);
      }
    } catch (error) {
      alert('Failed to renew config');
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
                        {format(peer.expiresAt, 'PPP')}
                        <span className="text-xs block text-muted-foreground">
                          {formatDistanceToNow(peer.expiresAt, { addSuffix: true })}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleRenewConfig} disabled={actionLoading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew (Extend 3 Months)
                    </Button>
                    <Button variant="outline" onClick={() => setShowCustomize(!showCustomize)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Customize
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have a WireGuard configuration yet
                  </p>
                  <Button
                    onClick={() => {
                      const pk = prompt('Enter your WireGuard public key:');
                      if (pk) handleCreateConfig(pk);
                    }}
                    disabled={actionLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customize Config */}
          {showCustomize && peer && (
            <TemplateEditor
              onSave={(cfg) => {
                setShowCustomize(false);
                // Would implement custom config download here
                alert('Custom configuration saved!');
              }}
            />
          )}

          {/* Config Display */}
          {peer && config && (
            <>
              <ConfigDisplay
                config={config}
                filename={`${session?.user?.name}-wireguard.conf`}
              />
              <QRCodeDisplay username={(session?.user as any)?.username} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
