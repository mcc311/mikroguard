'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface TemplateConfig {
  dns: string;
  allowedIPs: string;
  endpoint: string;
  persistentKeepalive: number;
}

export default function TemplateConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [config, setConfig] = useState<TemplateConfig>({
    dns: '1.1.1.1',
    allowedIPs: '0.0.0.0/0',
    endpoint: '',
    persistentKeepalive: 25,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Check admin access
    if (status === 'authenticated' && !(session?.user as any)?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Load current template values
    if (status === 'authenticated') {
      fetch('/api/admin/template')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConfig({
              dns: data.data.dns || '1.1.1.1',
              allowedIPs: data.data.allowedIPs?.join(', ') || '0.0.0.0/0',
              endpoint: data.data.endpoint || '',
              persistentKeepalive: data.data.persistentKeepalive || 25,
            });
          }
        })
        .catch(err => console.error('Failed to load template:', err));
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dns: config.dns,
          allowedIPs: config.allowedIPs.split(',').map(s => s.trim()),
          endpoint: config.endpoint,
          persistentKeepalive: config.persistentKeepalive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to save template: ' + data.error);
      }
    } catch (error) {
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !(session?.user as any)?.isAdmin) {
    return null;
  }

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
            <span className="text-sm text-muted-foreground">
              {session?.user?.name}
            </span>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => router.push('/api/auth/signout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Global Configuration Template</h2>
            <p className="text-muted-foreground">
              Set the default configuration that will be used for all new user configurations
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>
                These settings will be applied to all newly created user configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dns">DNS Server</Label>
                  <Input
                    id="dns"
                    placeholder="1.1.1.1"
                    value={config.dns}
                    onChange={(e) => setConfig({ ...config, dns: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Default DNS server for VPN connections
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedIPs">Allowed IPs</Label>
                  <Textarea
                    id="allowedIPs"
                    placeholder="0.0.0.0/0"
                    value={config.allowedIPs}
                    onChange={(e) => setConfig({ ...config, allowedIPs: e.target.value })}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of IP ranges. Use 0.0.0.0/0 to route all traffic through VPN.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint</Label>
                  <Input
                    id="endpoint"
                    placeholder="vpn.example.com:13231"
                    value={config.endpoint}
                    onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    VPN server address and port
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keepalive">Persistent Keepalive (seconds)</Label>
                  <Input
                    id="keepalive"
                    type="number"
                    placeholder="25"
                    value={config.persistentKeepalive}
                    onChange={(e) => setConfig({ ...config, persistentKeepalive: parseInt(e.target.value) || 25 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Interval for keepalive packets (recommended: 25)
                  </p>
                </div>

                {saveSuccess && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Template saved successfully! New configurations will use these settings.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Global Template'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
