'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Check } from 'lucide-react';
import { UI_TIMEOUTS } from '@/lib/constants';

interface ConfigDisplayProps {
  config: string;
  filename?: string;
}

export function ConfigDisplay({ config, filename = 'wireguard.conf' }: ConfigDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), UI_TIMEOUTS.COPY_FEEDBACK_MS);
  };

  const handleDownload = () => {
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WireGuard Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={config}
          readOnly
          className="font-mono text-sm h-64"
        />
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
