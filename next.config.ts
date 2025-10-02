import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  env: {
    // Expose NEXT_PUBLIC_APP_NAME at build time
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'MikroGuard',
  },
};

export default withNextIntl(nextConfig);
