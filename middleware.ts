import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Next.js Middleware - Runs on every request BEFORE pages/API routes
 *
 * This middleware:
 * 1. Protects authenticated routes (/dashboard/*, /admin/*)
 * 2. Protects API routes (/api/config/*, /api/admin/*)
 * 3. Checks admin authorization for /admin/* routes
 * 4. Allows public routes (/, /login, /api/auth/*)
 * 5. Preserves cron token-based auth for /api/cron/*
 *
 * SECURITY NOTE:
 * This project uses middleware as the sole method of route protection.
 * CVE-2025-29927 (middleware bypass via x-middleware-subrequest header) was fixed
 * in Next.js 15.2.3. This project requires Next.js >= 15.2.3 to ensure security.
 *
 * API routes do NOT perform redundant authorization checks - they trust the
 * middleware to have already validated authentication and authorization.
 */

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Admin route protection - check if user has admin role
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (!token?.isAdmin) {
        // Non-admin users trying to access admin routes - redirect to dashboard
        if (pathname.startsWith('/admin')) {
          const url = new URL('/dashboard', req.url);
          return NextResponse.redirect(url);
        }
        // Non-admin API calls - return 403
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    // Allow authenticated users to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Always allow /api/cron/* - it uses its own token-based auth
        if (pathname.startsWith('/api/cron')) {
          return true;
        }

        // Public routes - no auth required
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth')
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

/**
 * Matcher config - which routes this middleware applies to
 *
 * Protected routes:
 * - /dashboard/* - User dashboard and config pages
 * - /admin/* - Admin management pages
 * - /api/config/* - User API endpoints
 * - /api/admin/* - Admin API endpoints
 * - /api/cron/* - Cron job endpoints (handled separately with token)
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/config/:path*',
    '/api/admin/:path*',
    '/api/cron/:path*',
  ],
};
