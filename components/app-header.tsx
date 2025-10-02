'use client';

import { Shield, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Link } from '@/i18n/routing';
import { usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/language-switcher';

interface AppHeaderProps {
  userName?: string | null;
  isAdmin?: boolean;
  locale: string;
}

export function AppHeader({ userName, isAdmin, locale }: AppHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const tNav = useTranslations('navigation');
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'WireGuard Manager';

  // Check if current page is an admin page
  const isAdminPage = pathname.startsWith('/admin');

  const getBreadcrumbs = () => {
    if (pathname === '/dashboard') return [{ label: tNav('dashboard'), href: '/dashboard' }];
    if (pathname === '/dashboard/new') return [{ label: tNav('dashboard'), href: '/dashboard' }, { label: tNav('newConfiguration'), href: '/dashboard/new' }];
    if (pathname === '/admin') return [{ label: tNav('adminPanel'), href: '/admin' }];
    if (pathname === '/admin/template') return [{ label: tNav('adminPanel'), href: '/admin' }, { label: tNav('templateSettings'), href: '/admin/template' }];
    return [];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">{appName}</span>
          </Link>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/</span>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <>
                      <Link href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                      <span>/</span>
                    </>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Right: Language Switcher + User Menu */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher currentLocale={locale} />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">{userName || 'User'}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? t('administrator') : t('user')}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdminPage ? (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {tNav('dashboard')}
                  </Link>
                </DropdownMenuItem>
              ) : (
                isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {tNav('adminPanel')}
                    </Link>
                  </DropdownMenuItem>
                )
              )}
              {(isAdminPage || isAdmin) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
