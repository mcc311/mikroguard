'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSession } from 'next-auth/react';
import { LoadingPage } from '@/components/loading-skeletons';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return <LoadingPage />;
}
