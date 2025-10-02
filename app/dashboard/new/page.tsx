'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Copy, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NewConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [copied, setCopied] = useState(false);

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
    if (!publicKey.trim()) {
      alert('Please enter your public key');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/config/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedConfig(data.data.configFile);
        setStep(3);
      } else {
        alert('Failed to create config: ' + data.error);
      }
    } catch (error) {
      alert('Failed to create config');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(generatedConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

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
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => router.push('/api/auth/signout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

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
              <span className="text-sm font-medium">Create Tunnel</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium">Submit Key</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                3
              </div>
              <span className="text-sm font-medium">Copy Config</span>
            </div>
          </div>

          {/* Step 1: Create Empty Tunnel */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Create an Empty Tunnel</CardTitle>
                <CardDescription>
                  First, create a new empty tunnel in your WireGuard client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open your WireGuard application</li>
                    <li>Click on "Add Empty Tunnel" or "Create New Tunnel"</li>
                    <li>The app will generate a key pair for you automatically</li>
                    <li>Give your tunnel a name (e.g., "My VPN")</li>
                  </ol>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Note:</strong> Do not fill in any configuration details yet. We'll provide the complete configuration in the next steps.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)}>
                    Continue to Next Step
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Submit Public Key */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Copy and Submit Your Public Key</CardTitle>
                <CardDescription>
                  Find your public key in the tunnel you just created and paste it here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">How to find your public key:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>In WireGuard, select the tunnel you just created</li>
                    <li>Look for the "Public key" field in the Interface section</li>
                    <li>Copy the public key (it looks like: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">abc123...xyz=</code>)</li>
                    <li>Paste it in the field below</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publicKey">Your WireGuard Public Key</Label>
                  <Input
                    id="publicKey"
                    placeholder="Enter your public key here..."
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    The public key should be 44 characters long and end with '='
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleSubmitPublicKey} disabled={loading || !publicKey.trim()}>
                    {loading ? 'Creating Configuration...' : 'Submit and Generate Config'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Copy Configuration */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Copy Your Configuration</CardTitle>
                <CardDescription>
                  Your configuration is ready! Copy it and paste it into your WireGuard tunnel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Final Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Click the "Copy Configuration" button below</li>
                    <li>Go back to your WireGuard app</li>
                    <li>Edit your tunnel and replace ALL the content with the copied configuration</li>
                    <li>Save the tunnel</li>
                    <li>Activate your tunnel to connect!</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Your WireGuard Configuration</Label>
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
                          Copy Configuration
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={generatedConfig}
                    readOnly
                    className="font-mono text-xs h-64"
                  />
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>Important:</strong> Make sure to replace the entire content of your tunnel configuration, including the private key that was already there. The configuration we provide includes the correct server settings and your assigned IP address.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Link href="/dashboard">
                    <Button>
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
