'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { toast } from 'sonner';
import { UI_TIMEOUTS } from '@/lib/constants';
import { LoadingPage } from '@/components/loading-skeletons';
import { Input } from '@/components/ui/input';
import { validateWireGuardPublicKey } from '@/lib/validation/wireguard';
import { useTranslations } from 'next-intl';

export default function NewConfigPage() {
  const t = useTranslations('dashboardNew');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Check if user already has a config
    if (status === 'authenticated') {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            // User already has config, redirect to dashboard
            toast.error(t('alreadyHaveConfig'));
            router.push('/dashboard');
          } else {
            // User doesn't have config, allow access
            setCheckingExisting(false);
          }
        })
        .catch(() => {
          // On error, assume no config and allow access
          setCheckingExisting(false);
        });
    }
  }, [status, router]);

  const handleSubmitPublicKey = async () => {
    const trimmedKey = publicKey.trim();

    // Validate public key format
    const validation = validateWireGuardPublicKey(trimmedKey);
    if (!validation.isValid) {
      setKeyError(validation.error || 'Invalid public key');
      return;
    }

    setLoading(true);
    try {
      // Create peer
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: trimmedKey }),
      });

      const data = await res.json();

      if (data.success) {
        // Fetch generated config file
        const configRes = await fetch('/api/config/file');
        if (configRes.ok) {
          const configText = await configRes.text();
          setGeneratedConfig(configText);
          setStep(2);
          toast.success(tToast('configCreated'));
        } else {
          toast.error(tToast('failedToCreate'));
        }
      } else {
        toast.error(tToast('failedToCreate') + ': ' + data.error);
      }
    } catch {
      toast.error(tToast('failedToCreate'));
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
      toast.success(tToast('configCopied'));
    } catch {
      toast.error(tToast('failedToCopy'));
    }
  };

  if (status === 'loading' || checkingExisting) {
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
            <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                1
              </div>
              <span className="text-sm font-medium">{t('step1Title')}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium">{t('step2Title')}</span>
            </div>
          </div>

          {/* Step 1: Submit Public Key */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('beforeYouStart')}</CardTitle>
                  <CardDescription>
                    {t('beforeYouStartDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. {t('step1Instruction')}</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      <li>{t('step1Detail1')}</li>
                      <li>{t('step1Detail2')}</li>
                      <li>{t('step1Detail3')}</li>
                      <li>{t('step1Detail4')}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">2. {t('step2Instruction')}</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      <li>{t('step2Detail1')}</li>
                      <li>{t('step2Detail2')}</li>
                      <li>{t('step2Detail3')}</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm">
                      <strong>{t('noteTitle')}</strong> {t('noteText')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('publicKeyLabel')}</CardTitle>
                  <CardDescription>
                    {t('publicKeyPlaceholder')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="publicKey">{t('publicKeyLabel')}</Label>
                    <Input
                      id="publicKey"
                      placeholder={t('publicKeyPlaceholder')}
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
                        {t('publicKeyHintShort')}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmitPublicKey}
                    disabled={loading || !publicKey.trim()}
                    className="w-full"
                  >
                    {loading ? t('creating') : t('createButton')}
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
                  <CardTitle>{t('howToApply')}</CardTitle>
                  <CardDescription>
                    {t('howToApplyDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li className="text-base">{t('applyStep1')}</li>
                      <li className="text-base">{t('applyStep2')}</li>
                      <li className="text-base">{t('applyStep3')}</li>
                      <li className="text-base">{t('applyStep4')}</li>
                      <li className="text-base">{t('applyStep5')}</li>
                    </ol>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm">
                      <strong>{t('importantTitle')}</strong> {t('importantText')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Display */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('configTitle')}</CardTitle>
                  <CardDescription>
                    {t('configDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base font-semibold">{t('configLabel')}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyConfig}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {tCommon('copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            {tCommon('copy')}
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
                        {t('backButton')}
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
