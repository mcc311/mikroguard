'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface QRCodeDisplayProps {
  username: string;
}

export function QRCodeDisplay({ username }: QRCodeDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQRCode() {
      try {
        const res = await fetch('/api/config/qr');
        if (!res.ok) throw new Error('Failed to fetch QR code');

        const data = await res.json();
        if (data.success && data.data.qrCode) {
          setQrCode(data.data.qrCode);
        } else {
          throw new Error(data.error || 'Failed to generate QR code');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchQRCode();
  }, [username]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code for Mobile</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        {loading && <p>Generating QR code...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {qrCode && (
          <div className="bg-white p-4 rounded-lg">
            <Image
              src={qrCode}
              alt="WireGuard Configuration QR Code"
              width={300}
              height={300}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
