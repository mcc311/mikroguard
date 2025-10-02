'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Session } from 'next-auth';
import { LoadingPage } from '@/components/loading-skeletons';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface ExtendedSession extends Session {
  user: Session['user'] & {
    isAdmin?: boolean;
  };
}

interface TemplateConfig {
  dns: string;
  allowedIPs: string;
  endpoint: string;
  persistentKeepalive: number;
}

export default function TemplateConfigPage() {
  const t = useTranslations('template');
  const tToast = useTranslations('toast');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // NOTE: These UI defaults should match the server-side defaults in @/lib/config
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
    if (status === 'authenticated' && !(session as ExtendedSession | null)?.user?.isAdmin) {
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
        toast.success(tToast('templateSaved'));
      } else {
        toast.error(tToast('failedToSave') + ': ' + data.error);
      }
    } catch {
      toast.error(tToast('failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <LoadingPage />;
  }

  if (status === 'unauthenticated' || !(session as ExtendedSession | null)?.user?.isAdmin) {
    return null;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dns">{t('dns')}</Label>
                  <Input
                    id="dns"
                    placeholder={t('dnsPlaceholder')}
                    value={config.dns}
                    onChange={(e) => setConfig({ ...config, dns: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Default DNS server for VPN connections
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedIPs">{t('allowedIPs')}</Label>
                  <Textarea
                    id="allowedIPs"
                    placeholder={t('allowedIPsPlaceholder')}
                    value={config.allowedIPs}
                    onChange={(e) => setConfig({ ...config, allowedIPs: e.target.value })}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of IP ranges. Use 0.0.0.0/0 to route all traffic through VPN.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endpoint">{t('endpoint')}</Label>
                  <Input
                    id="endpoint"
                    placeholder={t('endpointPlaceholder')}
                    value={config.endpoint}
                    onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    VPN server address and port
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keepalive">{t('keepalive')}</Label>
                  <Input
                    id="keepalive"
                    type="number"
                    placeholder={t('keepalivePlaceholder')}
                    value={config.persistentKeepalive}
                    onChange={(e) => setConfig({ ...config, persistentKeepalive: parseInt(e.target.value) || 25 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Interval for keepalive packets (recommended: 25)
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? t('saving') : t('saveButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
