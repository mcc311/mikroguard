'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PeerTable } from '@/components/PeerTable';
import { StatsCardSkeleton, PeerTableSkeleton, LoadingPage } from '@/components/loading-skeletons';
import { WireGuardPeer } from '@/types';
import { Users, CheckCircle, Clock, AlertTriangle as AlertIcon, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';
import { TIME_THRESHOLDS } from '@/lib/constants';
import { toast } from 'sonner';
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; username: string }>({
    open: false,
    username: '',
  });

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
        toast.success(`Disabled ${data.data.expiredCount} expired peers`, {
          description: 'All expired VPN configurations have been automatically disabled',
        });
        await fetchPeers();
      } else {
        toast.error('Failed to check expired peers', {
          description: data.error || 'Please try again later',
        });
      }
    } catch {
      toast.error('Failed to check expired peers', {
        description: 'Network error, please try again later',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePeerAction = async (username: string, action: 'enable' | 'disable' | 'renew' | 'delete') => {
    if (action === 'delete') {
      setDeleteDialog({ open: true, username });
      return;
    }

    setActionLoading(true);
    const actionLabels = {
      enable: 'Enable',
      disable: 'Disable',
      renew: 'Renew',
    };
    const label = actionLabels[action];

    try {
      const res = await fetch(`/api/admin/peers/${username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${label} successful`, {
          description: `Successfully ${action}d configuration for user ${username}`,
        });
        await fetchPeers();
      } else {
        toast.error(`Failed to ${action}`, {
          description: data.error || 'Please try again later',
        });
      }
    } catch {
      toast.error(`Failed to ${action}`, {
        description: 'Network error, please try again later',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    const username = deleteDialog.username;
    setDeleteDialog({ open: false, username: '' });
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/peers/${username}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Delete successful', {
          description: `Successfully deleted configuration for user ${username}`,
        });
        await fetchPeers();
      } else {
        toast.error('Failed to delete', {
          description: data.error || 'Please try again later',
        });
      }
    } catch {
      toast.error('Failed to delete', {
        description: 'Network error, please try again later',
      });
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
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Management Actions</CardTitle>
                  </div>
                  <Link href="/admin/template">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button disabled>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button disabled variant="outline">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Check & Disable Expired
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>All Peers</CardTitle>
                <CardDescription>Manage all WireGuard peer configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <PeerTableSkeleton />
              </CardContent>
            </Card>
          </div>
      </main>
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
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Peers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{peers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{activePeers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{expiringSoon}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
                <AlertIcon className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{expiredPeers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Management Actions</CardTitle>
                  <CardDescription>Administrative operations</CardDescription>
                </div>
                <Link href="/admin/template">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Template Settings
                  </Button>
                </Link>
              </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the WireGuard configuration for user{' '}
              <span className="font-semibold text-foreground">{deleteDialog.username}</span>?
              <br />
              <br />
              This action cannot be undone. The user will need to create a new configuration to connect to the VPN again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
