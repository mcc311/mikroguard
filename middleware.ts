import { withAuth } from 'next-auth/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

/**
 * Next.js Middleware - Runs on every request BEFORE pages/API routes
 *
 * This middleware:
 * 1. Handles i18n locale detection and routing (from Accept-Language header, cookie, or URL)
 * 2. Protects authenticated routes (/{locale}/dashboard/*, /{locale}/admin/*)
 * 3. Protects API routes (/api/config/*, /api/admin/*)
 * 4. Checks admin authorization for /{locale}/admin/* routes
 * 5. Allows public routes (/, /{locale}/login, /api/auth/*)
 * 6. Preserves cron token-based auth for /api/cron/*
 *
 * SECURITY NOTE:
 * This project uses middleware as the sole method of route protection.
 * CVE-2025-29927 (middleware bypass via x-middleware-subrequest header) was fixed
 * in Next.js 15.2.3. This project requires Next.js >= 15.2.3 to ensure security.
 *
 * API routes do NOT perform redundant authorization checks - they trust the
 * middleware to have already validated authentication and authorization.
 */

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware(routing);

// Helper to check if path is an API route
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// Extract locale from pathname (e.g., /en/dashboard -> en)
function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as 'en' | 'zh-TW' | 'ja')) {
    return segments[0];
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Skip i18n middleware for API routes
    if (isApiRoute(pathname)) {
      // Admin API protection - check if user has admin role
      if (pathname.startsWith('/api/admin')) {
        if (!token?.isAdmin) {
          return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
          );
        }
      }
      return NextResponse.next();
    }

    // Apply i18n middleware for non-API routes
    const intlResponse = intlMiddleware(req as NextRequest);

    // Get locale from path
    const locale = getLocaleFromPath(pathname) || routing.defaultLocale;

    // Admin route protection - check if user has admin role
    if (pathname.includes('/admin')) {
      if (!token?.isAdmin) {
        // Non-admin users trying to access admin routes - redirect to dashboard
        const url = new URL(`/${locale}/dashboard`, req.url);
        return NextResponse.redirect(url);
      }
    }

    return intlResponse;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Always allow /api/cron/* - it uses its own token-based auth
        if (pathname.startsWith('/api/cron')) {
          return true;
        }

        // Always allow /api/auth/* - NextAuth routes
        if (pathname.startsWith('/api/auth')) {
          return true;
        }

        // API routes require authentication (except above exceptions)
        if (isApiRoute(pathname)) {
          return !!token;
        }

        // Get locale from path for non-API routes
        const locale = getLocaleFromPath(pathname);

        // Root path - allow (will be handled by i18n redirect)
        if (pathname === '/') {
          return true;
        }

        // Login page - allow
        if (pathname === `/${locale}/login` || pathname.includes('/login')) {
          return true;
        }

        // All other locale-prefixed routes require authentication
        if (locale) {
          return !!token;
        }

        // Allow non-locale paths to pass through (will be redirected by i18n)
        return true;
      },
    },
    pages: {
      signIn: `/${routing.defaultLocale}/login`,
    },
  }
);

/**
 * Matcher config - which routes this middleware applies to
 *
 * Matches:
 * - All routes with locale prefix: /{locale}/*
 * - API routes: /api/*
 * - Root path: /
 *
 * Excludes:
 * - Static files: _next, images, favicon, etc.
 */
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next|_vercel|.*\\..*).*)',
    // Always match API routes
    '/api/:path*',
  ],
};
