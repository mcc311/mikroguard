'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UI_TIMEOUTS } from '@/lib/constants';
import { LoadingPage } from '@/components/loading-skeletons';
import { Input } from '@/components/ui/input';

export default function NewConfigPage() {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState('');

  // WireGuard public key is 44 characters base64 string ending with '='
  const validatePublicKey = (key: string): boolean => {
    const trimmedKey = key.trim();

    // Check length
    if (trimmedKey.length !== 44) {
      setKeyError('Public key must be exactly 44 characters long');
      return false;
    }

    // Check if ends with '='
    if (!trimmedKey.endsWith('=')) {
      setKeyError('Public key must end with "="');
      return false;
    }

    // Check base64 format (alphanumeric + / + + and ends with =)
    const base64Regex = /^[A-Za-z0-9+/]{43}=$/;
    if (!base64Regex.test(trimmedKey)) {
      setKeyError('Public key contains invalid characters');
      return false;
    }

    setKeyError('');
    return true;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Check if user already has a config
    if (status === 'authenticated') {
      fetch('/api/config/my')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            // User already has config, redirect to dashboard
            router.push('/dashboard');
          }
        });
    }
  }, [status, router]);

  const handleSubmitPublicKey = async () => {
    const trimmedKey = publicKey.trim();

    if (!trimmedKey) {
      setKeyError('Please enter your public key');
      return;
    }

    // Validate public key format
    if (!validatePublicKey(trimmedKey)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/config/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: trimmedKey }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedConfig(data.data.configFile);
        setStep(2);
        toast.success('Configuration created successfully!');
      } else {
        toast.error('Failed to create config: ' + data.error);
      }
    } catch {
      toast.error('Failed to create config');
    } finally {
      setLoading(false);
    }
  };

  const handlePublicKeyChange = (value: string) => {
    // Remove any newlines or whitespace
    const cleanedValue = value.replace(/\s/g, '');
    setPublicKey(cleanedValue);

    // Clear error when user starts typing
    if (keyError) {
      setKeyError('');
    }
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(generatedConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), UI_TIMEOUTS.COPY_FEEDBACK_MS);
      toast.success('Configuration copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (status === 'loading') {
    return <LoadingPage />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Create New WireGuard Configuration</h2>
            <p className="text-muted-foreground">
              Follow these steps to set up your WireGuard VPN connection
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                1
              </div>
              <span className="text-sm font-medium">Submit Public Key</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium">Copy Configuration</span>
            </div>
          </div>

          {/* Step 1: Submit Public Key */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle>Before You Start</CardTitle>
                  <CardDescription>
                    Follow these steps to prepare your WireGuard tunnel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Create an Empty Tunnel</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      <li>Open your WireGuard application</li>
                      <li>Click &quot;Add Empty Tunnel&quot; or &quot;Create New Tunnel&quot;</li>
                      <li>WireGuard will generate a key pair for you automatically</li>
                      <li>Give it a name (e.g., &quot;My VPN&quot;)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">2. Find Your Public Key</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      <li>In the tunnel you created, find the Interface section</li>
                      <li>Look for the &quot;Public key&quot; field</li>
                      <li>Copy the entire key (it looks like: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">abc123...xyz=</code>)</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm">
                      <strong>Note:</strong> Don&apos;t fill in any other configuration yet. We&apos;ll provide the complete config in the next step.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Submit Your Public Key</CardTitle>
                  <CardDescription>
                    Paste your WireGuard public key below
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="publicKey">Public Key</Label>
                    <Input
                      id="publicKey"
                      placeholder="Paste your public key here..."
                      value={publicKey}
                      onChange={(e) => handlePublicKeyChange(e.target.value)}
                      className={`font-mono text-sm ${keyError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {keyError ? (
                      <div className="flex items-start gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{keyError}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Should be 44 characters and end with &apos;=&apos;
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmitPublicKey}
                    disabled={loading || !publicKey.trim()}
                    className="w-full"
                  >
                    {loading ? 'Creating Configuration...' : 'Generate Configuration'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Copy Configuration */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Instructions First */}
              <Card>
                <CardHeader>
                  <CardTitle>How to Apply Your Configuration</CardTitle>
                  <CardDescription>
                    Follow these steps carefully to complete your setup
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li className="text-base">
                        <strong>Copy the configuration below</strong> using the Copy button
                      </li>
                      <li className="text-base">
                        Go back to your WireGuard app and <strong>edit your tunnel</strong>
                      </li>
                      <li className="text-base">
                        <strong>Keep your Private Key</strong> - only replace the content <strong>after</strong> the Private Key line
                      </li>
                      <li className="text-base">
                        Paste the copied configuration, making sure to keep your own Private Key in the [Interface] section
                      </li>
                      <li className="text-base">
                        Save and activate your tunnel to connect
                      </li>
                    </ol>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm">
                      <strong>Important:</strong> The Private Key in the configuration below is a placeholder. You must keep your own Private Key that was generated by WireGuard.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Your WireGuard Configuration</CardTitle>
                  <CardDescription>
                    Copy this configuration and apply it to your tunnel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base font-semibold">Configuration</Label>
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
                    <div className="relative">
                      <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto">
                        <code>{generatedConfig}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link href="/dashboard">
                      <Button size="lg">
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
