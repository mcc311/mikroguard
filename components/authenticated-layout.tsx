'use client';

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { usePathname } from '@/i18n/routing';
import { AppHeader } from './app-header';
import type { Session } from 'next-auth';

interface ExtendedSession extends Session {
  user: Session['user'] & {
    isAdmin?: boolean;
  };
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Don't show header on login page or root redirect page
  const shouldShowHeader = pathname !== '/login' && pathname !== '/';

  if (!shouldShowHeader) {
    return <>{children}</>;
  }

  const isAdmin = (session as ExtendedSession | null)?.user?.isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader userName={session?.user?.name} isAdmin={isAdmin} locale={locale} />
      {children}
    </div>
  );
}
