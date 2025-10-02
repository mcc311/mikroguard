'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PeerTable } from '@/components/PeerTable';
import { WireGuardPeer } from '@/types';
import { Shield, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';
import { TIME_THRESHOLDS } from '@/lib/constants';
import type { Session } from 'next-auth';

interface ExtendedSession extends Session {
  user: Session['user'] & {
    isAdmin?: boolean;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [peers, setPeers] = useState<WireGuardPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !(session as ExtendedSession | null)?.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session as ExtendedSession | null)?.user?.isAdmin) {
      fetchPeers();
    }
  }, [status, session]);

  const fetchPeers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/peers');
      const data = await res.json();

      if (data.success) {
        // Convert date strings to Date objects
        const peersWithDates = data.data.map((peer: WireGuardPeer & { createdAt: string; expiresAt: string }) => ({
          ...peer,
          createdAt: new Date(peer.createdAt),
          expiresAt: new Date(peer.expiresAt),
        }));
        setPeers(peersWithDates);
      }
    } catch {
      console.error('Failed to fetch peers');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExpired = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/check-expired', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        alert(`Disabled ${data.data.expiredCount} expired peers`);
        await fetchPeers();
      }
    } catch {
      alert('Failed to check expired peers');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePeerAction = async (username: string, action: 'enable' | 'disable' | 'renew' | 'delete') => {
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${username}'s configuration?`)) {
      return;
    }

    setActionLoading(true);
    try {
      let res;
      if (action === 'delete') {
        res = await fetch(`/api/admin/peers/${username}`, {
          method: 'DELETE',
        });
      } else {
        res = await fetch(`/api/admin/peers/${username}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
      }

      const data = await res.json();

      if (data.success) {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        await fetchPeers();
      } else {
        alert(`Failed to ${action}: ` + data.error);
      }
    } catch {
      alert(`Failed to ${action} peer`);
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

  if (status === 'unauthenticated' || !(session as ExtendedSession | null)?.user?.isAdmin) {
    return null;
  }

  const activePeers = peers.filter(p => !p.disabled).length;
  const expiredPeers = peers.filter(p => p.expiresAt < new Date()).length;
  const expiringSoon = peers.filter(p => {
    const diff = p.expiresAt.getTime() - Date.now();
    return diff > 0 && diff < TIME_THRESHOLDS.EXPIRATION_WARNING_MS;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">WireGuard Manager - Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/template">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Template Settings
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                My Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => router.push('/api/auth/signout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Peers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{peers.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{activePeers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{expiringSoon}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{expiredPeers}</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Management Actions</CardTitle>
              <CardDescription>Administrative operations</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={fetchPeers} disabled={actionLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleCheckExpired} disabled={actionLoading} variant="outline">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Check & Disable Expired
              </Button>
            </CardContent>
          </Card>

          {/* Peers Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Peers</CardTitle>
              <CardDescription>Manage all WireGuard peer configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <PeerTable
                peers={peers}
                onAction={handlePeerAction}
                showActions={true}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
