import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // All supported locales
  locales: ['en', 'zh-TW', 'ja'],

  // Default locale when user visits root path
  defaultLocale: 'en',

  // Always include locale prefix in URLs
  // /dashboard -> /en/dashboard, /zh-TW/dashboard, /ja/dashboard
  localePrefix: 'always',

  // Detect locale from Accept-Language header
  localeDetection: true,
});

// Type-safe navigation utilities
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
