'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
        <CardTitle>Customize Configuration</CardTitle>
        <CardDescription>
          Adjust these settings to customize your WireGuard configuration
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
              DNS server to use for VPN connection
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedIPs">Allowed IPs</Label>
            <Textarea
              id="allowedIPs"
              placeholder="10.10.10.0/24, 10.0.0.0/24"
              value={config.allowedIPs}
              onChange={(e) => setConfig({ ...config, allowedIPs: e.target.value })}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated list of IP ranges to route through VPN
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

          <Button type="submit" className="w-full">
            Save Configuration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
