'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface TemplateConfig {
  dns: string;
  allowedIPs: string;
  endpoint: string;
  persistentKeepalive: number;
}

interface TemplateEditorProps {
  defaultValues?: Partial<TemplateConfig>;
  onSave: (config: TemplateConfig) => void;
}

export function TemplateEditor({ defaultValues, onSave }: TemplateEditorProps) {
  const t = useTranslations('template');
  // NOTE: These UI defaults should match the server-side defaults in @/lib/config
  const [config, setConfig] = useState<TemplateConfig>({
    dns: defaultValues?.dns || '1.1.1.1',
    allowedIPs: defaultValues?.allowedIPs || '10.10.10.0/24,10.0.0.0/24',
    endpoint: defaultValues?.endpoint || '',
    persistentKeepalive: defaultValues?.persistentKeepalive || 25,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
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
              DNS server to use for VPN connection
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
              Comma-separated list of IP ranges to route through VPN
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

          <Button type="submit" className="w-full">
            {t('saveButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
